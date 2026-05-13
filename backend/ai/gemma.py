import base64
import json
from pathlib import Path
from typing import Any, Optional
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


def encode_image(image_path: str) -> str:
    """Convert local image file to base64 string for Gemma 4 vision."""
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def chat_text(
    prompt: str,
    system: str = "",
    temperature: float = 1.0,  # Google's recommended default for Gemma 4
    json_mode: bool = False,
) -> str:
    """Simple text-only Gemma 4 call."""
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    kwargs: dict[str, Any] = {
        "model": settings.GEMMA_MODEL,
        "messages": messages,
        "options": {"temperature": temperature},
    }
    if json_mode:
        kwargs["format"] = "json"

    response = ollama.chat(**kwargs)
    return response["message"]["content"]


def chat_vision(
    prompt: str,
    image_path: str,
    system: str = "",
    detail: str = "medium",  # "low" | "medium" | "high"
    json_mode: bool = False,
) -> str:
    """
    Gemma 4 multimodal call — image + text prompt.
    The visual_token_budget option controls how much detail Gemma 4
    allocates to the image. Use "high" for handwritten forms.
    """
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
            "visual_token_budget": TOKEN_BUDGETS[detail],  # Gemma 4 specific!
        },
    }
    if json_mode:
        kwargs["format"] = "json"

    response = ollama.chat(**kwargs)
    return response["message"]["content"]


def chat_with_tools(
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
    full_messages = []
    if system:
        full_messages.append({"role": "system", "content": system})
    full_messages.extend(messages)

    response = ollama.chat(
        model=settings.GEMMA_MODEL,
        messages=full_messages,
        tools=tools,
        options={"temperature": 1.0},
    )
    return response["message"]
