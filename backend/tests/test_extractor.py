import sys
from unittest.mock import MagicMock, patch
import pytest

# We mock 'ollama' because it's not installed in our test environment
sys.modules['ollama'] = MagicMock()

# Do not mock pydantic_settings as it breaks the `config.py` default usage.
# Instead, ensure it is installed if needed or we let it pass through.
# The error was caused by mocking pydantic_settings which mocked settings.GEMMA_MAX_CONCURRENCY

from ai.extractor import extract_from_voice, IntakeRecord, OllamaUnavailableError

@pytest.mark.asyncio
async def test_extract_from_voice_fallback():
    # Setup the mock for chat_text to raise an exception
    with patch('ai.extractor.chat_text', side_effect=OllamaUnavailableError("Mocked unavailable")) as mock_chat:
        # Rephrased the transcription so that `re.search(r"\b(\d{1,2})\s*(?:people|persons|family|famil(?:y|ies))\b", lowered)` matches properly
        transcription = "Patient has severe bleeding and chest pain. Needs medical attention immediately. Also needs shelter and water. 4 family members."

        # Call the function under test
        result = await extract_from_voice(transcription)

        # Verify that chat_text was indeed called
        mock_chat.assert_called_once()

        # Verify that the result is an instance of IntakeRecord
        assert isinstance(result, IntakeRecord)

        # Verify that the fallback extraction parsed the urgency and other fields correctly
        assert result.medical_urgency == "critical" # Since 'chest pain' and 'severe bleeding' are present
        assert result.shelter_needed is True
        assert result.water_needed is True
        assert result.family_members == 4
        assert "chest pain" in result.presenting_issues
        assert "bleeding" in result.presenting_issues
        assert result.extraction_confidence == "low"
