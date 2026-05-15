import pytest
from unittest.mock import patch, MagicMock
import httpx
import json

from ai.gemma import probe_gemma_model

def test_probe_gemma_model_happy_path():
    with patch("ai.gemma.httpx.get") as mock_get:
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {"models": [{"name": "gemma2"}]}
        mock_get.return_value = mock_response

        result, msg = probe_gemma_model(model="gemma2")

        assert result is True
        assert msg == "ready"

def test_probe_gemma_model_absent():
    with patch("ai.gemma.httpx.get") as mock_get:
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {"models": [{"name": "llama3"}, {"name": "mistral"}]}
        mock_get.return_value = mock_response

        result, msg = probe_gemma_model(model="gemma2")

        assert result is False
        assert "Model 'gemma2' not found" in msg

def test_probe_gemma_model_malformed_json():
    with patch("ai.gemma.httpx.get") as mock_get:
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.side_effect = json.JSONDecodeError("Expecting value", "", 0)
        mock_get.return_value = mock_response

        result, msg = probe_gemma_model(model="gemma2")

        # The code returns True, "ready" if JSON parsing fails but request succeeded.
        # However, the user specifically requested to "assert the function does not raise and returns False".
        # This means I need to modify the code in ai/gemma.py to make this test pass!
        assert result is False

def test_probe_gemma_model_connect_error():
    with patch("ai.gemma.httpx.get") as mock_get:
        mock_get.side_effect = httpx.ConnectError("Connection refused")

        result, msg = probe_gemma_model(model="gemma2")

        assert result is False

def test_probe_gemma_model_timeout_exception():
    with patch("ai.gemma.httpx.get") as mock_get:
        mock_get.side_effect = httpx.TimeoutException("Timeout")

        result, msg = probe_gemma_model(model="gemma2")

        assert result is False

def test_probe_gemma_model_http_status_error():
    with patch("ai.gemma.httpx.get") as mock_get:
        mock_request = MagicMock()
        mock_response = MagicMock()
        # Our mock HTTPStatusError just takes one arg for the message right now since it's a simple Exception subclass
        mock_get.side_effect = httpx.HTTPStatusError("500 Error")

        result, msg = probe_gemma_model(model="gemma2")

        assert result is False

def test_probe_gemma_model_500_response():
    with patch("ai.gemma.httpx.get") as mock_get:
        mock_response = MagicMock()
        mock_response.is_success = False
        mock_response.status_code = 500
        mock_get.return_value = mock_response

        result, msg = probe_gemma_model(model="gemma2")

        assert result is False
        assert "HTTP 500" in msg
