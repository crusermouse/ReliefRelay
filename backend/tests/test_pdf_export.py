import sys
from unittest.mock import MagicMock, patch
from types import ModuleType
import pytest
from pathlib import Path

# Mock dependencies that might be missing
for mod_name in ['pydantic_settings', 'ollama', 'langchain_community', 'langchain', 'langchain_ollama', 'chromadb', 'pypdf', 'docx', 'reportlab', 'reportlab.lib', 'reportlab.lib.pagesizes', 'reportlab.lib.colors', 'reportlab.lib.styles', 'reportlab.lib.units', 'reportlab.pdfbase', 'reportlab.pdfbase.pdfmetrics', 'reportlab.pdfbase.ttfonts', 'reportlab.platypus', 'httpx', 'pydantic', 'aiofiles', 'PIL']:
    if mod_name not in sys.modules:
        sys.modules[mod_name] = MagicMock()

# Specifically mock config because other modules might import it
if 'config' not in sys.modules:
    config = ModuleType('config')
    settings = MagicMock()
    settings.GEMMA_MAX_CONCURRENCY = 1
    settings.GEMMA_DETERMINISTIC = True
    settings.CASES_DB = ":memory:"
    config.settings = settings
    sys.modules['config'] = config

from tools.pdf_export import generate_pdf, OUTPUT_DIR

# Common fixture for test cases
@pytest.fixture
def valid_case_id():
    return "CASE-123456"

@pytest.fixture
def mock_case_data():
    return {
        "case_id": "CASE-123456",
        "triage_level": "RED",
        "intake_data": {
            "name": "Jane Doe",
            "age": 30,
            "gender": "Female",
            "location_found": "Downtown",
            "medical_urgency": "high",
            "family_members": 2,
            "language_preference": "Spanish",
            "shelter_needed": True,
            "food_needed": True,
            "water_needed": False,
            "medication_needed": "Insulin",
            "special_needs": "None",
            "presenting_issues": ["dehydration"],
            "missing_information": ["Phone number"]
        },
        "action_plan": "1. Provide medical care\n2. Arrange shelter"
    }

def test_generate_pdf_success(valid_case_id, mock_case_data):
    """Test PDF generation with valid data (Happy Path)."""
    with patch("tools.pdf_export.get_case") as mock_get_case, \
         patch("tools.pdf_export.SimpleDocTemplate") as mock_doc_template:

        mock_get_case.return_value = mock_case_data

        # Mock the document instance returned by SimpleDocTemplate
        mock_doc_instance = MagicMock()
        mock_doc_template.return_value = mock_doc_instance

        output_path = generate_pdf(valid_case_id)

        expected_path = str(OUTPUT_DIR / f"relief_case_{valid_case_id}.pdf")
        assert output_path == expected_path

        mock_get_case.assert_called_once_with(valid_case_id)
        mock_doc_template.assert_called_once()
        mock_doc_instance.build.assert_called_once()

        # Check if the build method was called with a list (the story)
        args, kwargs = mock_doc_instance.build.call_args
        assert isinstance(args[0], list)
        assert len(args[0]) > 0

def test_generate_pdf_invalid_case_id():
    """Test PDF generation with an invalid case ID."""
    with pytest.raises(ValueError, match="Invalid case_id format"):
        generate_pdf("INVALID-ID")

def test_generate_pdf_case_not_found(valid_case_id):
    """Test PDF generation when the case is not found."""
    with patch("tools.pdf_export.get_case") as mock_get_case:
        mock_get_case.return_value = None

        with pytest.raises(ValueError, match=f"Case {valid_case_id} not found"):
            generate_pdf(valid_case_id)

def test_generate_pdf_fallback_story(valid_case_id, mock_case_data):
    """Test that the fallback story is built if the main build fails."""
    with patch("tools.pdf_export.get_case") as mock_get_case, \
         patch("tools.pdf_export.SimpleDocTemplate") as mock_doc_template:

        mock_get_case.return_value = mock_case_data

        mock_doc_instance = MagicMock()
        mock_doc_template.return_value = mock_doc_instance

        # Make the first call to build raise an Exception
        mock_doc_instance.build.side_effect = [Exception("Build failed"), None]

        output_path = generate_pdf(valid_case_id)

        expected_path = str(OUTPUT_DIR / f"relief_case_{valid_case_id}.pdf")
        assert output_path == expected_path

        # Build should be called twice (once for the main story, once for the fallback)
        assert mock_doc_instance.build.call_count == 2
