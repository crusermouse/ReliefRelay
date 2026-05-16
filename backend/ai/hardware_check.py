"""
hardware_check.py — Detects whether local inference is viable.

Decision logic:
  1. Is psutil available? If not, skip to cloud.
  2. Is available system RAM >= MIN_RAM_GB? If not, use cloud.
  3. Is the Ollama server reachable at OLLAMA_BASE_URL? If not, use cloud.
  4. Is the configured model pulled and listed by Ollama? If not, use cloud.
  5. All checks pass → use local inference.

Returns: Literal["google", "ollama"]
"""

import os
import httpx
from typing import Literal

MIN_RAM_GB = 10.0          # Minimum RAM to attempt local inference
OLLAMA_TIMEOUT = 3.0       # Seconds to wait for Ollama health check
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
LOCAL_MODEL = os.environ.get("GEMMA_MODEL", "gemma4:latest")


def check_ram() -> tuple[bool, float]:
    """Returns (has_enough_ram, available_gb)."""
    try:
        import psutil
        available_bytes = psutil.virtual_memory().available
        available_gb = available_bytes / (1024 ** 3)
        return available_gb >= MIN_RAM_GB, round(available_gb, 1)
    except ImportError:
        return False, 0.0


def check_ollama_server() -> bool:
    """Returns True if the Ollama HTTP server responds."""
    try:
        r = httpx.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=OLLAMA_TIMEOUT)
        return r.status_code == 200
    except Exception:
        return False


def check_model_pulled() -> bool:
    """Returns True if the configured local model is listed in Ollama."""
    try:
        r = httpx.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=OLLAMA_TIMEOUT)
        if r.status_code != 200:
            return False
        models = [m["name"] for m in r.json().get("models", [])]
        return any(LOCAL_MODEL in m for m in models)
    except Exception:
        return False


def detect_inference_provider() -> tuple[Literal["google", "ollama"], dict]:
    """
    Run all hardware checks and return the appropriate inference provider.

    Returns:
        provider: "google" or "ollama"
        report: dict with check results for startup logging
    """
    # If user has explicitly set GEMMA_PROVIDER, respect it and skip checks
    explicit = os.environ.get("GEMMA_PROVIDER", "").strip().lower()
    if explicit in ("google", "ollama"):
        return explicit, {"reason": f"Explicitly set via GEMMA_PROVIDER={explicit}"}

    report = {}

    # Check 1: RAM
    has_ram, available_gb = check_ram()
    report["ram_available_gb"] = available_gb
    report["ram_sufficient"] = has_ram
    if not has_ram:
        report["reason"] = f"Insufficient RAM ({available_gb}GB available, {MIN_RAM_GB}GB required)"
        return "google", report

    # Check 2: Ollama server reachable
    server_up = check_ollama_server()
    report["ollama_server_reachable"] = server_up
    if not server_up:
        report["reason"] = "Ollama server not running or unreachable"
        return "google", report

    # Check 3: Model is pulled
    model_ready = check_model_pulled()
    report["model_pulled"] = model_ready
    if not model_ready:
        report["reason"] = f"Model '{LOCAL_MODEL}' not found in Ollama"
        return "google", report

    report["reason"] = "All hardware checks passed"
    return "ollama", report
