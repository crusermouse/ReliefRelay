"""
Google AI Studio inference provider for ReliefRelay.
Uses the google-genai SDK to call hosted Gemma models.
Mirrors the same function signatures as the original Ollama-based gemma.py
so all callers (extractor.py, agent.py, rag.py) work without modification.
"""

import base64
import json
import os
from pathlib import Path
from typing import Any

from google import genai
from google.genai import types
from fastapi import HTTPException

# ── CLIENT SETUP ───────────────────────────────────────────────────────────
# Uses GOOGLE_API_KEY from environment. Key is obtained free from:
# https://aistudio.google.com/app/apikey
_client = None

def _get_client():
    global _client
    if _client is None:
        from config import settings
        key = settings.GOOGLE_API_KEY
        if not key:
            key = os.environ.get("GOOGLE_API_KEY", "")
        if not key:
             raise ValueError("GOOGLE_API_KEY not found in settings or environment.")
        _client = genai.Client(
            api_key=key,
            http_options={'api_version': 'v1beta'}
        )
    return _client

# Model to use — gemma-4-31b-it is the strongest Gemma hosted on AI Studio.
# Change to "gemma-4-26b-a4b-it" if rate limits are hit during heavy demo use.
def _get_model():
    from config import settings
    return settings.GEMMA_MODEL_CLOUD or os.environ.get("GEMMA_MODEL_CLOUD", "gemma-4-31b-it")


# ── TEXT INFERENCE ─────────────────────────────────────────────────────────
async def chat_text(
    prompt: str,
    system: str = "",
    temperature: float = 1.0,
    json_mode: bool = False,
) -> str:
    """
    Simple text-only inference via Google AI Studio.
    Equivalent to the original Ollama chat_text().
    """
    config = types.GenerateContentConfig(
        temperature=temperature,
        system_instruction=system if system else None,
        response_mime_type="application/json" if json_mode else "text/plain",
    )

    try:
        response = await _get_client().aio.models.generate_content(
            model=_get_model(),
            contents=prompt,
            config=config,
        )
        return response.text
    except Exception as e:
        if "429" in str(e) or "ResourceExhausted" in str(type(e).__name__):
            raise HTTPException(status_code=429, detail="Inference rate limit reached. Wait 10 seconds and retry.")
        raise


# ── VISION INFERENCE ───────────────────────────────────────────────────────
async def chat_vision(
    prompt: str,
    image_path: str,
    system: str = "",
    detail: str = "medium",   # kept for API compatibility, not used by cloud
    json_mode: bool = False,
) -> str:
    """
    Multimodal text + image inference via Google AI Studio.
    Equivalent to the original Ollama chat_vision().
    Accepts a local image file path and uploads it inline as base64.
    """
    image_bytes = Path(image_path).read_bytes()
    suffix = Path(image_path).suffix.lower()
    mime_map = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
    }
    mime_type = mime_map.get(suffix, "image/jpeg")

    image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
    text_part = types.Part.from_text(text=prompt)

    config = types.GenerateContentConfig(
        temperature=1.0,
        system_instruction=system if system else None,
        response_mime_type="application/json" if json_mode else "text/plain",
    )

    try:
        response = await _get_client().aio.models.generate_content(
            model=_get_model(),
            contents=[image_part, text_part],
            config=config,
        )
        return response.text
    except Exception as e:
        if "429" in str(e) or "ResourceExhausted" in str(type(e).__name__):
            raise HTTPException(status_code=429, detail="Inference rate limit reached. Wait 10 seconds and retry.")
        raise


# ── TOOL CALLING (FUNCTION CALLING) ────────────────────────────────────────
async def chat_with_tools(
    messages: list[dict],
    tools: list[dict],
    system: str = "",
) -> dict:
    """
    Two-pass tool-calling inference via Google AI Studio.
    Converts the Ollama-style tool schema into Google AI Studio format.
    Returns a dict with the same shape as the Ollama response so agent.py
    does not need to change.

    Return shape:
    {
        "content": str,
        "tool_calls": [
            {
                "function": {
                    "name": str,
                    "arguments": dict
                }
            }
        ] | None
    }
    """
    # Convert Ollama tool schema → Google genai FunctionDeclaration
    google_tools = _convert_tools(tools)

    # Build contents list from messages
    contents = _build_contents(messages)

    config = types.GenerateContentConfig(
        temperature=1.0,
        system_instruction=system if system else None,
        tools=google_tools,
    )

    try:
        response = await _get_client().aio.models.generate_content(
            model=_get_model(),
            contents=contents,
            config=config,
        )

        # Normalize response into the shape agent.py expects
        return _normalize_response(response)
    except Exception as e:
        if "429" in str(e) or "ResourceExhausted" in str(type(e).__name__):
            raise HTTPException(status_code=429, detail="Inference rate limit reached. Wait 10 seconds and retry.")
        raise


# ── STREAMING TEXT (for future use in frontend SSE) ────────────────────────
async def stream_text(prompt: str, system: str = ""):
    """
    Streaming text inference. Yields text chunks as they arrive.
    Use in FastAPI with StreamingResponse for cinematic token-by-token display.
    """
    config = types.GenerateContentConfig(
        temperature=1.0,
        system_instruction=system if system else None,
    )
    try:
        async for chunk in await _get_client().aio.models.generate_content_stream(
            model=_get_model(),
            contents=prompt,
            config=config,
        ):
            if chunk.text:
                yield chunk.text
    except Exception as e:
        if "429" in str(e) or "ResourceExhausted" in str(type(e).__name__):
            # For generators, we might need a different error handling strategy depending on FastAPI usage
            # but for now we follow the instruction to catch and surface.
            raise HTTPException(status_code=429, detail="Inference rate limit reached. Wait 10 seconds and retry.")
        raise


# ── INTERNAL HELPERS ────────────────────────────────────────────────────────
def _convert_tools(ollama_tools: list[dict]) -> list:
    """Convert Ollama-format tool schemas to Google genai FunctionDeclaration."""
    declarations = []
    for tool in ollama_tools:
        fn = tool.get("function", {})
        declarations.append(
            types.Tool(
                function_declarations=[
                    types.FunctionDeclaration(
                        name=fn["name"],
                        description=fn.get("description", ""),
                        parameters=fn.get("parameters", {}),
                    )
                ]
            )
        )
    return declarations


def _build_contents(messages: list[dict]) -> list:
    """Convert Ollama message list to Google genai contents format."""
    contents = []
    for msg in messages:
        role = "user" if msg["role"] in ("user", "tool") else "model"
        content = msg.get("content", "")
        if isinstance(content, str):
            contents.append(types.Content(
                role=role,
                parts=[types.Part.from_text(text=content)]
            ))
    return contents


def _normalize_response(response) -> dict:
    """
    Normalize Google AI Studio response into the dict shape
    that agent.py expects from the Ollama client.
    """
    result = {"content": "", "tool_calls": None}

    candidate = response.candidates[0] if response.candidates else None
    if not candidate:
        return result

    tool_calls = []
    text_parts = []

    for part in candidate.content.parts:
        if part.function_call:
            tool_calls.append({
                "function": {
                    "name": part.function_call.name,
                    "arguments": dict(part.function_call.args),
                }
            })
        elif part.text:
            text_parts.append(part.text)

    result["content"] = "".join(text_parts)
    if tool_calls:
        result["tool_calls"] = tool_calls

    return result
