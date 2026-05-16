"""
gemma.py — Inference provider router for ReliefRelay.

Selects inference backend based on GEMMA_PROVIDER environment variable:
  - "google"  → Google AI Studio (recommended, cloud-hosted Gemma)
  - "ollama"  → Local Ollama server (requires 10GB+ RAM)

All downstream callers (extractor.py, agent.py, rag.py) import from this
module and are unaffected by which provider is active.
"""

import os

# Import Ollama-specific types/errors that might be needed for type checking or compatibility
from ai.ollama_provider import OllamaUnavailableError, probe_ollama, probe_gemma_model

PROVIDER = os.environ.get("GEMMA_PROVIDER", "google").lower()

if PROVIDER == "google":
    from ai.gemini_provider import (
        chat_text,
        chat_vision,
        chat_with_tools,
        stream_text,
    )
else:
    # Ollama fallback — only use if GEMMA_PROVIDER=ollama in .env
    # Requires gemma4:e2b or gemma4:latest pulled via `ollama pull`
    # and at least 10GB available RAM.
    from ai.ollama_provider import (
        chat_text,
        chat_vision,
        chat_with_tools,
    )
    def stream_text(prompt: str, system: str = ""):
        # Simple non-streaming fallback for now
        async def _gen():
            yield await chat_text(prompt, system)
        return _gen()
