"""
gemma.py — Inference provider router for ReliefRelay.

Chooses between Google AI Studio and local Ollama using the hardware-aware
fallback checks in ai.hardware_check. All downstream callers import from this
module without needing to know which provider is active.
"""

from ai.hardware_check import detect_inference_provider
from ai.ollama_provider import OllamaUnavailableError, probe_gemma_model, probe_ollama

# Run hardware detection once at import time.
# ACTIVE_PROVIDER is "google" or "ollama" depending on available RAM,
# Ollama server status, and whether the model is pulled.
# If GEMMA_PROVIDER is set explicitly in .env, that value takes precedence.
ACTIVE_PROVIDER, HARDWARE_REPORT = detect_inference_provider()
PROVIDER = ACTIVE_PROVIDER  # alias kept for any callers that reference PROVIDER

if ACTIVE_PROVIDER == "google":
    from ai.gemini_provider import (
        chat_text,
        chat_vision,
        chat_with_tools,
        stream_text,
    )
else:
    # Ollama fallback — only active when hardware checks pass or
    # GEMMA_PROVIDER=ollama is set explicitly in .env.
    # Requires gemma4:e2b or gemma4:latest pulled via `ollama pull`
    # and at least 10GB available RAM.
    from ai.ollama_provider import (
        chat_text,
        chat_vision,
        chat_with_tools,
    )

    def stream_text(prompt: str, system: str = ""):
        # Simple non-streaming fallback for local Ollama path.
        # Wraps the synchronous chat_text response as a single async chunk.
        async def _gen():
            yield await chat_text(prompt, system)

        return _gen()