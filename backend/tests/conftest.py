import sys
from unittest.mock import MagicMock
import pytest

# Mock early before pytest imports test files
mock_pydantic_settings = MagicMock()
mock_ollama = MagicMock()
mock_reportlab = MagicMock()
mock_chromadb = MagicMock()
mock_httpx = MagicMock()

class ConnectError(Exception): pass
class TimeoutException(Exception): pass
class HTTPStatusError(Exception): pass
class Request:
    def __init__(self, method, url):
        self.method = method
        self.url = url
class Response:
    def __init__(self, status_code, request=None):
        self.status_code = status_code
        self.request = request

mock_httpx.ConnectError = ConnectError
mock_httpx.TimeoutException = TimeoutException
mock_httpx.HTTPStatusError = HTTPStatusError
mock_httpx.Request = Request
mock_httpx.Response = Response

sys.modules["pydantic_settings"] = mock_pydantic_settings
sys.modules["ollama"] = mock_ollama
sys.modules["reportlab"] = mock_reportlab
sys.modules["reportlab.pdfgen"] = MagicMock()
sys.modules["reportlab.lib"] = MagicMock()
sys.modules["reportlab.lib.pagesizes"] = MagicMock()
sys.modules["reportlab.pdfbase"] = MagicMock()
sys.modules["reportlab.pdfbase.ttfonts"] = MagicMock()
sys.modules["chromadb"] = mock_chromadb
sys.modules["httpx"] = mock_httpx

# Mock the settings object explicitly
class MockSettings:
    OLLAMA_BASE_URL = "http://localhost:11434"
    GEMMA_MODEL = "gemma2"
    GEMMA_MAX_CONCURRENCY = 1
    GEMMA_STREAMING = False
    GEMMA_DETERMINISTIC = True
    GEMMA_REQUEST_TIMEOUT = 30
    GEMMA_MAX_TOKENS = 1000
    GEMMA_WARMUP_PROMPT = "hello"
    GEMMA_WARMUP_TIMEOUT = 5

mock_config = MagicMock()
mock_config.settings = MockSettings()
sys.modules["config"] = mock_config

@pytest.fixture(scope="session", autouse=True)
def mock_dependencies():
    """Mock heavy or unavailable dependencies for testing."""
    yield
