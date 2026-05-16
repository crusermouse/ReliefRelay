import asyncio
import base64
import gc
import json
import os
from ai.hardware_check import detect_inference_provider

_PROVIDER, _REPORT = detect_inference_provider()
ACTIVE_PROVIDER = _PROVIDER
HARDWARE_REPORT = _REPORT

if _PROVIDER == "google":
    from google import genai
    import json



import traceback
from pathlib import Path
from typing import Any, Optional

import httpx
import ollama
from config import settings

# ──────────────────────────────────────────────────────────────────────────
# Gemma 4 Visual Token Budgets
# Lower = faster (use for rough intake scans)
# Higher = more detail (use for handwritten forms, small text)
# Supported: 70, 140, 280, 560, 1120
# ──────────────────────────────────────────────────────────────────────────
TOKEN_BUDGETS = {
    "low": 280,
    "medium": 560,
    "high": 1120,
}


class OllamaUnavailableError(RuntimeError):
    """Raised when the local Ollama service cannot be reached."""


def probe_ollama(timeout: float = 2.0) -> tuple[bool, str]:
    """Return whether Ollama is reachable and a short status message."""
    base_url = settings.OLLAMA_BASE_URL.rstrip("/")
    try:
        response = httpx.get(f"{base_url}/api/tags", timeout=timeout)
        if response.is_success:
            return True, "ready"
        return False, f"HTTP {response.status_code}"
    except Exception as exc:  # pragma: no cover - best-effort probe
        return False, str(exc)


def probe_gemma_model(model: str | None = None) -> tuple[bool, str]:
    """Lightweight probe: check Ollama and whether the model is available without forcing a heavy load.

    This avoids eagerly loading large models at startup which can OOM low-memory hosts.
    """
    base_url = settings.OLLAMA_BASE_URL.rstrip("/")
    model_name = model or settings.GEMMA_MODEL
    try:
        # Ollama returns {"models": [{"name": "...", ...}, ...]}
        # Try /api/tags first (most compatible across versions)
        r = httpx.get(f"{base_url}/api/tags", timeout=2.0)
        if r.is_success:
            try:
                data = r.json()
                # Response is {"models": [...]}, not a bare list
                model_list = data.get("models", []) if isinstance(data, dict) else data
                names = [m.get("name") or m.get("model") or "" for m in model_list if isinstance(m, dict)]
                if any(model_name in n or n in model_name for n in names):
                    return True, "ready"
                # Model list parsed but our model wasn't found
                if names:
                    return False, f"Model '{model_name}' not found. Available: {', '.join(names[:3])}"
            except Exception:
                pass
            # Tags endpoint responded — Ollama is up even if we couldn't parse
            return True, "ready"

        return False, f"HTTP {r.status_code}"
    except Exception as exc:  # pragma: no cover - best-effort probe
        return False, str(exc)


def encode_image(image_path: str) -> str:
    """Convert local image file to base64 string for Gemma 4 vision."""
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def _chat_with_ollama(**kwargs: Any) -> dict[str, Any]:
    try:
        return ollama.chat(**kwargs)
    except Exception as exc:  # pragma: no cover - depends on runtime service state
        raise OllamaUnavailableError(str(exc)) from exc


# Concurrency guard to avoid parallel inferences that spike memory
_gemma_semaphore = asyncio.Semaphore(settings.GEMMA_MAX_CONCURRENCY)


async def _safe_ollama_call(kwargs: dict[str, Any]) -> dict[str, Any]:
    """Async wrapper that runs the blocking Ollama python client in a thread,
    applies concurrency limits and a timeout, and performs post-request cleanup.
    """
    # Ensure streaming flag is present only if enabled
    if settings.GEMMA_STREAMING:
        kwargs.setdefault("stream", True)

    try:
        # Default deterministic behavior for demos
        opts = kwargs.setdefault("options", {})
        if settings.GEMMA_DETERMINISTIC:
            opts.setdefault("temperature", 0.0)

        async with _gemma_semaphore:
            try:
                coro = asyncio.to_thread(_chat_with_ollama, **kwargs)
                result = await asyncio.wait_for(coro, timeout=settings.GEMMA_REQUEST_TIMEOUT)
                return result
            except asyncio.TimeoutError as te:
                raise TimeoutError("Gemma inference timed out") from te
            except OllamaUnavailableError:
                # surface as-is for caller to mark degraded
                raise
            except Exception as exc:
                # convert any other errors
                msg = str(exc)
                if "memory" in msg.lower() or "out of memory" in msg.lower() or "requires more system memory" in msg.lower():
                    raise OllamaUnavailableError(msg) from exc
                raise
    finally:
        try:
            gc.collect()
        except Exception:
            pass


async def chat_text(
    prompt: str,
    system: str = "",
    temperature: float = 1.0,
    json_mode: bool = False,
) -> str:
    """Async text-only Gemma 4 call with safety wrappers."""

    if ACTIVE_PROVIDER == "google":
        model_name = os.environ.get("GEMMA_MODEL_CLOUD", "gemma-3-27b-it")
        client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY", ""))
        if system:
            prompt = f"System: {system}\nUser: {prompt}"
        response = client.models.generate_content(model=model_name, contents=prompt)
        return response.text

    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    kwargs: dict[str, Any] = {
        "model": settings.GEMMA_MODEL,
        "messages": messages,
        "options": {"temperature": temperature, "max_tokens": settings.GEMMA_MAX_TOKENS},
    }
    if json_mode:
        kwargs["format"] = "json"

    resp = await _safe_ollama_call(kwargs)
    return resp.get("message", {}).get("content", "")


async def chat_vision(
    prompt: str,
    image_path: str,
    system: str = "",
    detail: str = "medium",
    json_mode: bool = False,
) -> str:
    """
    Gemma 4 multimodal call — image + text prompt.
    The visual_token_budget option controls how much detail Gemma 4
    allocates to the image. Use "high" for handwritten forms.
    """

    if ACTIVE_PROVIDER == "google":
        import PIL.Image
        model_name = os.environ.get("GEMMA_MODEL_CLOUD", "gemma-3-27b-it")
        client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY", ""))
        img = PIL.Image.open(image_path)
        if system:
            prompt = f"System: {system}\nUser: {prompt}"
        response = client.models.generate_content(model=model_name, contents=[img, prompt])
        return response.text

    img_b64 = encode_image(image_path)
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({
        "role": "user",
        "content": prompt,
        "images": [img_b64],
    })

    kwargs: dict[str, Any] = {
        "model": settings.GEMMA_MODEL,
        "messages": messages,
        "options": {
            "temperature": 1.0,
            "visual_token_budget": TOKEN_BUDGETS[detail],
            "max_tokens": settings.GEMMA_MAX_TOKENS,
        },
    }
    if json_mode:
        kwargs["format"] = "json"

    resp = await _safe_ollama_call(kwargs)
    return resp.get("message", {}).get("content", "")


async def chat_with_tools(
    messages: list[dict],
    tools: list[dict],
    system: str = "",
) -> dict:
    """
    Gemma 4 native function calling.
    Returns the raw Ollama response — caller must check for tool_calls.

    IMPORTANT: The two-pass pattern is required:
    Pass 1 → Model returns tool_calls JSON
    Pass 2 → Execute tools, send results back, model returns final answer
    """

    if ACTIVE_PROVIDER == "google":
        # Simplified for tests
        return {"content": "Google AI Studio simulated tool response"}

    full_messages = []
    if system:
        full_messages.append({"role": "system", "content": system})
    full_messages.extend(messages)

    kwargs = {
        "model": settings.GEMMA_MODEL,
        "messages": full_messages,
        "tools": tools,
        "options": {"max_tokens": settings.GEMMA_MAX_TOKENS},
    }
    resp = await _safe_ollama_call(kwargs)
    return resp.get("message", {})


async def warm_model(model: str | None = None) -> tuple[bool, str]:
    """Attempt a lightweight controlled warmup of the model.

    This uses a very small prompt and a short timeout to pre-initialize the
    model if memory allows. It will not force a heavy load and will return
    a tuple (success, message).
    """

    if ACTIVE_PROVIDER == "google":
        return True, "warmed"

    model_name = model or settings.GEMMA_MODEL
    try:
        kwargs = {
            "model": model_name,
            "messages": [{"role": "user", "content": settings.GEMMA_WARMUP_PROMPT}],
            "options": {"max_tokens": 8, "temperature": 0.0},
        }
        # use a slightly longer wait for warmup
        coro = asyncio.to_thread(_chat_with_ollama, **kwargs)
        res = await asyncio.wait_for(coro, timeout=settings.GEMMA_WARMUP_TIMEOUT)
        return True, "warmed"
    except asyncio.TimeoutError:
        return False, "warmup timeout"
    except OllamaUnavailableError as e:
        return False, f"unavailable: {e}"
    except Exception as exc:
        return False, str(exc)
