# Contributing to ReliefRelay

Thank you for your interest in improving ReliefRelay! This guide will help you understand the project structure, extend the system, and troubleshoot common issues.

---

## Project Philosophy

**ReliefRelay is designed with three core principles:**

1. **Offline-First**: All inference happens locally. No cloud calls. No data transmission. Ever.
2. **Graceful Degradation**: If any service (Ollama, RAG, database) becomes unavailable, the system uses fallback strategies instead of crashing.
3. **Humanitarian-First**: Design decisions prioritize emergency responders' needs over perfect code. Speed > perfection.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Frontend (port 3000)            │
│  IntakePanel → TriageCard → EvidenceRail → ActionPacket    │
└──────────────────────────┬──────────────────────────────────┘
                           │ POST /intake or /demo-intake
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                  FastAPI Backend (port 8000)                │
│                                                              │
│  intake.py          Multimodal form extraction             │
│  ├─ extract_from_image()    Gemma 4 Vision                │
│  ├─ extract_from_voice()    Keyword matching fallback      │
│  └─ extract_from_text()     Regex extraction              │
│                                                              │
│  agent.py           Two-pass tool calling                  │
│  ├─ First pass:  Gemma generates tool_calls                │
│  ├─ Execute:     search_resources + create_case            │
│  └─ Second pass: Gemma refines action_plan                 │
│                                                              │
│  rag.py             ChromaDB + nomic-embed-text             │
│  ├─ build_index()   Chunk relief docs (500-token overlap)  │
│  └─ retrieve()      Top-4 similarity search                │
│                                                              │
│  export.py          PDF generation + CSV/ZIP export         │
└──────────┬──────────────────────────────────────────────────┘
           │
           ├─ Ollama (port 11434)
           │  └─ Gemma 4 E4B (9.6 GB)
           │
           ├─ ChromaDB (local vector DB)
           │  └─ /backend/data/chroma_db/
           │
           └─ SQLite (case persistence)
              └─ /backend/data/cases.db
```

---

## Extending ReliefRelay

### Adding New Data Sources to RAG

1. **Add documents** to `backend/data/relief_docs/`:
   - Markdown files (.md)
   - PDF files (.pdf) — automatically extracted
   - Example: `sphere_handbook_2024.pdf`

2. **Rebuild the index**:
   ```bash
   cd backend
   source .venv/bin/activate
   python -c "from ai.rag import build_index; build_index()"
   ```

3. **Verify**:
   ```bash
   python -c "from ai.rag import load_index; idx = load_index(); print(f'Loaded {len(idx._ids)} vectors')"
   ```

### Adding New Tools to the Agent

1. **Define tool in `backend/ai/agent.py`**:
   ```python
   def my_new_tool(param1: str) -> dict:
       """Tool description for Gemma 4 function calling."""
       # Implementation
       return {"result": "..."}
   ```

2. **Register in Gemma prompt**:
   ```python
   AGENT_TOOLS = [
       ...
       {"name": "my_new_tool", "description": "...", "params": [...]}
   ]
   ```

3. **Test**:
   ```bash
   curl -X POST http://localhost:8000/intake \
     -F "manual_text=Test query for my_new_tool"
   ```

### Adding Custom Intake Fields

1. **Update Pydantic schema** in `backend/ai/extractor.py`:
   ```python
   class IntakeRecord(BaseModel):
       # ... existing fields
       new_field: Optional[str] = None  # Add this
   ```

2. **Update extraction prompt** in `EXTRACTION_SYSTEM`:
   ```
   Extract 'new_field' from the form if present. Set to null if unclear.
   ```

3. **Update frontend** in `relief-relay-ui/src/lib/types.ts`:
   ```typescript
   interface IntakeRecord {
       // ... existing fields
       new_field?: string;
   }
   ```

### Adding Export Formats

New export formats can be added to `backend/api/export.py`:

```python
@router.get("/export/bulk/json-ld")
async def export_jsonld(limit: int = 50):
    """Export cases in JSON-LD linked data format for semantic web."""
    cases = list_cases(limit=limit)
    # Implement JSON-LD serialization
    return ...
```

---

## Known Issues & Workarounds

### Issue: Gemma 4 OOM (Out of Memory) Errors

**Symptom**: Inference hangs or throws "out of memory" exception

**Root Cause**: E4B model requires 9.6GB + 2-3GB working memory

**Workaround**:
1. Switch to E2B (3.5GB): `GEMMA_MODEL=gemma4:e2b` in `.env`
2. Reduce visual token budget: `VISUAL_TOKEN_BUDGET=280` (faster, less accurate)
3. Increase Docker memory: `docker update --memory 16g <container>`
4. Restart Ollama: `ollama serve --gpu disabled` (force CPU mode diagnostics)

### Issue: ChromaDB Index Corruption

**Symptom**: Vector similarity search returns no results or crashes

**Root Cause**: Corrupted SQLite .db files in chroma_db/ directory

**Workaround**:
1. Delete corrupted index:
   ```bash
   rm -rf backend/data/chroma_db/
   ```
2. Rebuild index:
   ```bash
   cd backend
   python -c "from ai.rag import build_index; build_index()"
   ```

### Issue: "Cannot connect to Ollama" on First Run

**Symptom**: Backend starts but intake fails with "Could not connect to Ollama"

**Root Cause**: Model pull takes 30+ minutes; Gemma 4 not yet cached

**Workaround**:
1. Wait for `ollama pull gemma4:e4b` to complete (run in separate terminal)
2. Verify with: `ollama list` (should show gemma4:e4b)
3. Retry intake on frontend

### Issue: Frontend "API Unreachable" on First Load

**Symptom**: Next.js page loads but shows "Backend unreachable" toast

**Root Cause**: Next.js dev server loaded before FastAPI started

**Workaround**:
1. Wait for FastAPI to print: `[SUCCESS] ReliefRelay API ready`
2. Hard refresh browser: Cmd+Shift+R (or Ctrl+Shift+R on Linux)
3. Check CORS origins in `backend/main.py` if error persists

### Issue: Voice Recording Not Working in Browser

**Symptom**: "Voice input is unavailable" message on /voice mode

**Root Cause**: Browser doesn't support Web Speech API (Firefox, Safari)

**Workaround**:
1. Use Chrome/Edge (both support Web Speech API)
2. Or copy-paste transcript into fallback textarea
3. Or use image/text input mode instead

### Issue: PDF Export Takes Too Long (>10s)

**Symptom**: "Export PDF" button hangs for 10+ seconds

**Root Cause**: ReportLab generates full-page PDF from large action plans

**Workaround**:
1. This is expected behavior; not a bug
2. For bulk export, use `/export/bulk/zip` (generates in background)
3. Confirm PDF was generated: check `ls backend/data/pdfs/`

---

## Running Tests

Currently, ReliefRelay has **no formal test suite**. For Kaggle competition, this is acceptable for a Hackathon-submitted solution.

**To add tests** (post-competition):

```bash
# Backend tests
pip install pytest pytest-asyncio
pytest backend/tests/

# Frontend tests
npm install --save-dev jest @testing-library/react
npm test
```

---

## Development Tips

### Debugging Intake Failures

1. **Enable verbose logging**:
   ```bash
   export LOG_LEVEL=DEBUG
   uvicorn main:app --reload --port 8000 --log-level debug
   ```

2. **Manually test extraction**:
   ```bash
   cd backend && source .venv/bin/activate
   python -c "
   from ai.extractor import extract_from_text
   result = extract_from_text('John, 45, chest pain, needs doctor')
   print(result.dict())
   "
   ```

3. **Test RAG retrieval**:
   ```bash
   python -c "
   from ai.rag import load_index, retrieve
   idx = load_index()
   results = retrieve('chest pain critical urgency', idx, k=4)
   for r in results: print(r['content'][:100])
   "
   ```

### Performance Profiling

To identify bottlenecks:

```bash
# Time a single intake request
time curl -X POST http://localhost:8000/intake \
  -F "manual_text=John Doe, age 45, chest pain"

# Profile Gemma inference
python -c "
import time
from ai.gemma import chat_text
start = time.time()
chat_text('Summarize: critical injury')
print(f'Inference took {time.time() - start:.1f}s')
"
```

### Local Deployment Checklist

Before submitting, verify:

- [ ] `ollama list` shows `gemma4:e4b` and `nomic-embed-text`
- [ ] `backend/data/relief_docs/` has at least 1 markdown or PDF
- [ ] `backend/data/resources/directory.json` has sample resources
- [ ] `npm run build` completes without TypeScript errors
- [ ] `uvicorn main:app --reload` prints `[SUCCESS]`
- [ ] First intake (live inference) completes in <90s (CPU) or <15s (GPU)
- [ ] Demo mode returns result in <200ms
- [ ] PDF export works: `curl http://localhost:8000/export/{case_id}/pdf > test.pdf`
- [ ] CSV export works: `curl http://localhost:8000/export/bulk/csv > cases.csv`

---

## Reporting Issues

If you encounter a bug or have a feature request:

1. **Check troubleshooting guide above** (99% of issues are known)
2. **Enable DEBUG logging** to capture context
3. **Include**:
   - Error message (full stack trace if possible)
   - Steps to reproduce
   - Your environment (OS, Python version, Node version, Docker image)
   - Output of `ollama list` and `ollama serve` logs

---

## License

ReliefRelay is Apache 2.0 licensed. All contributions are assumed to be under the same license.

**Model Attribution**: Gemma 4 is Apache 2.0 licensed by Google DeepMind. See [Gemma Model Card](https://huggingface.co/google/gemma-2-2b).

---

## Questions?

- **Architecture questions**: See project.txt for detailed build blueprint
- **API questions**: Run `curl http://localhost:8000/docs` (OpenAPI interactive docs)
- **RAG customization**: See relief_standards.md comments
- **Deployment questions**: See README.md setup section

---

**Built for rapid deployment in disaster zones. Speed > perfection. Offline > cloud. Humans > AI.**
