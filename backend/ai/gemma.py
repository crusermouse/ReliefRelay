"""
gemma.py — Inference provider router for ReliefRelay.

Chooses between Google AI Studio and local Ollama using the hardware-aware
fallback checks in ai.hardware_check. All downstream callers import from this
module without needing to know which provider is active.
"""

from ai.hardware_check import detect_inference_provider
from ai.ollama_provider import OllamaUnavailableError, probe_gemma_model, probe_ollama

ACTIVE_PROVIDER, HARDWARE_REPORT = detect_inference_provider()
PROVIDER = ACTIVE_PROVIDER

if ACTIVE_PROVIDER == "google":
    from ai.gemini_provider import (
        chat_text,
        chat_vision,
        chat_with_tools,
        stream_text,
    )
else:
    from ai.ollama_provider import (
        chat_text,
        chat_vision,
        chat_with_tools,
    )

    def stream_text(prompt: str, system: str = ""):
        async def _gen():
            yield await chat_text(prompt, system)

        return _gen()
