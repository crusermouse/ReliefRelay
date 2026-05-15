import unittest
from unittest.mock import AsyncMock, patch, MagicMock
import sys
import asyncio

# Mocking dependencies
mock_modules = [
    'fastapi', 'fastapi.responses', 'aiofiles', 'pydantic_settings', 'ollama',
    'langchain_community', 'langchain_community.document_loaders', 'langchain_community.vectorstores',
    'langchain', 'langchain_ollama', 'chromadb', 'langchain_text_splitters',
    'pypdf', 'docx', 'reportlab', 'reportlab.lib', 'reportlab.pdfgen',
    'reportlab.platypus', 'reportlab.lib.pagesizes', 'reportlab.lib.styles',
    'reportlab.lib.units', 'reportlab.pdfbase', 'reportlab.pdfbase.ttfonts',
    'httpx', 'pydantic', 'PIL', 'main', 'config', 'ai', 'ai.extractor', 'ai.rag', 'ai.agent', 'ai.gemma', 'tools', 'tools.pdf_export'
]
for mod_name in mock_modules:
    sys.modules[mod_name] = MagicMock()

# Manually create router and its post decorator to avoid MagicMock in await expression
class MockRouter:
    def post(self, *args, **kwargs):
        def decorator(func):
            return func
        return decorator
sys.modules['fastapi'].APIRouter = MockRouter

sys.modules['config'].settings = MagicMock()
sys.modules['config'].settings.GEMMA_MAX_CONCURRENCY = 1

# Now we can safely import process_intake
from api.intake import process_intake

class TestIntakeSecurity(unittest.IsolatedAsyncioTestCase):
    async def test_intake_path_traversal_protection(self):
        mock_image = MagicMock()
        mock_image.filename = "../../../etc/passwd"
        mock_image.read = AsyncMock(return_value=b"fake data")

        # Patching all awaited things in api.intake
        with patch("api.intake.uuid.uuid4", return_value="test-uuid"), \
             patch("api.intake.aiofiles.open") as mock_aio_open, \
             patch("api.intake.extract_from_image") as mock_extract, \
             patch("api.intake.extract_from_voice") as mock_voice, \
             patch("api.intake.extract_from_text") as mock_text, \
             patch("api.intake.run_intake_agent") as mock_run_agent, \
             patch("api.intake.retrieve") as mock_retrieve:

            # Setup aiofiles.open
            mock_f = MagicMock()
            mock_f.write = AsyncMock()
            mock_cm = MagicMock()
            mock_cm.__aenter__ = AsyncMock(return_value=mock_f)
            mock_cm.__aexit__ = AsyncMock()
            mock_aio_open.return_value = mock_cm

            # Setup returns
            mock_record = MagicMock()
            mock_record.medical_urgency = "low"
            mock_record.presenting_issues = []
            mock_record.dict.return_value = {"medical_urgency": "low", "presenting_issues": []}
            mock_extract.side_effect = AsyncMock(return_value=mock_record)

            mock_run_agent.side_effect = AsyncMock(return_value={
                "case_id": "CASE-123",
                "action_plan": "test",
                "resources_found": [],
                "tool_calls_made": []
            })

            # Ensure other awaited things are also AsyncMock
            mock_voice.side_effect = AsyncMock(return_value=MagicMock())
            mock_text.side_effect = AsyncMock(return_value=MagicMock())
            mock_retrieve.return_value = []

            sys.modules['main'].vector_store = MagicMock()

            # In the test, we must provide mock objects that don't satisfy 'if voice_text'
            # or 'if manual_text' unless we want to mock them too.
            # In FastAPI, Form("") returns a Form object which is truthy.
            # But here I am calling it directly.

            await process_intake(image=mock_image, voice_text="", manual_text="")

            # Verify constructed path
            args, _ = mock_aio_open.call_args
            constructed_path = args[0]
            print(f"Constructed path: {constructed_path}")

            self.assertNotIn("..", constructed_path)
            self.assertNotIn("etc/passwd", constructed_path)
            self.assertTrue(constructed_path.startswith("/tmp/"))
            self.assertIn("passwd", constructed_path)
            self.assertIn("test-uuid_passwd", constructed_path)

if __name__ == "__main__":
    unittest.main()
