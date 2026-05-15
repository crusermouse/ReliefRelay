from unittest.mock import MagicMock, patch
import sys
from types import ModuleType

# Mock dependencies that might be missing
for mod_name in ['pydantic_settings', 'ollama', 'langchain_community', 'langchain', 'langchain_ollama', 'chromadb', 'pypdf', 'docx', 'reportlab', 'reportlab.lib', 'reportlab.pdfgen', 'reportlab.platypus', 'httpx', 'pydantic', 'aiofiles', 'PIL']:
    if mod_name not in sys.modules:
        sys.modules[mod_name] = MagicMock()

# Specifically mock config because agent.py imports it
if 'config' not in sys.modules:
    config = ModuleType('config')
    settings = MagicMock()
    settings.GEMMA_MAX_CONCURRENCY = 1
    settings.GEMMA_DETERMINISTIC = True
    config.settings = settings
    sys.modules['config'] = config

# Specifically mock tools
if 'tools' not in sys.modules:
    sys.modules['tools'] = MagicMock()
if 'tools.case_manager' not in sys.modules:
    sys.modules['tools.case_manager'] = MagicMock()
if 'tools.resource_lookup' not in sys.modules:
    sys.modules['tools.resource_lookup'] = MagicMock()

import pytest
from ai.agent import execute_tool

def test_execute_tool_search_local_resources():
    with patch("ai.agent.search_resources") as mock_search:
        mock_search.return_value = [{"name": "Shelter A"}]
        tool_args = {
            "resource_type": "shelter",
            "location": "Downtown",
            "family_size": 2
        }
        result = execute_tool("search_local_resources", tool_args)

        assert result == {"results": [{"name": "Shelter A"}], "resource_type": "shelter"}
        mock_search.assert_called_once_with(
            resource_type="shelter",
            location="Downtown",
            family_size=2
        )

def test_execute_tool_create_case():
    with patch("ai.agent.create_case_db") as mock_create_case:
        mock_create_case.return_value = "CASE-123"
        tool_args = {
            "intake_data": {"name": "John Doe"},
            "triage_level": "GREEN"
        }
        result = execute_tool("create_case", tool_args)

        assert result == {"case_id": "CASE-123", "status": "created"}
        mock_create_case.assert_called_once_with(
            intake_data={"name": "John Doe"},
            triage_level="GREEN"
        )

def test_execute_tool_unknown_tool():
    result = execute_tool("unknown_tool", {})
    assert result == {"error": "Unknown tool: unknown_tool"}

def test_execute_tool_exception():
    with patch("ai.agent.search_resources") as mock_search:
        mock_search.side_effect = Exception("Database error")
        tool_args = {"resource_type": "shelter"}
        result = execute_tool("search_local_resources", tool_args)

        assert result == {"error": "search_local_resources failed: Database error"}
