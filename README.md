# ReliefRelay

**Offline-first disaster relief intake copilot** — turning handwritten forms, voice notes, and photos into structured action plans in seconds, powered entirely by Gemma 4 running locally.

Built for the Gemma 4 Hackathon. Zero cloud. Zero cost. Real impact.

---

## What it does

A field volunteer photographs a handwritten intake form at a disaster shelter. ReliefRelay:

1. **Extracts** structured fields from the photo using Gemma 4 vision (name, age, medical urgency, needs)
2. **Retrieves** relevant relief policy sections from a local RAG corpus (Sphere Handbook, WHO guidelines)
3. **Runs an agent** that calls local tools — finding nearby resources, saving the case to SQLite
4. **Generates** a grounded action plan backed by cited policy documents
5. **Exports** a printable PDF referral packet — ready to hand to the family

Everything runs on the volunteer's laptop. No internet required.

---

## Architecture

```
Form Photo / Voice Note / Text
        ↓
   Next.js UI (port 3000)
        ↓ POST /intake
   FastAPI Backend (port 8000)
        ↓
   Gemma 4 Vision (Ollama, port 11434)
   → IntakeRecord (Pydantic JSON)
        ↓
   ChromaDB RAG (nomic-embed-text)
   → top-4 policy chunks
        ↓
   Gemma 4 Agent (two-pass tool calling)
   → search_local_resources()
   → create_case() → SQLite
        ↓
   Action Plan + Evidence Rail + PDF Export
```

**Gemma 4 capabilities used:**
- Native multimodal input (vision + text) with configurable `visual_token_budget`
- Native function calling (two-pass tool orchestration)
- 128K context window for full policy RAG context
- MoE architecture for efficient local inference
- Runs offline via Ollama

---

## Prerequisites

| Requirement | Version |
|---|---|
| Ollama | 0.6.x+ |
| Python | 3.11+ |
| Node.js | 20+ |
| RAM | 12 GB+ (16 GB recommended) |

**Recommended model:** `gemma4:e4b` (9.6 GB) — use `gemma4:e2b` if memory-constrained.

---

## Setup

### 1. Install Ollama and pull models

```bash
# macOS / Linux
curl -fsSL https://ollama.com/install.sh | sh

# Pull Gemma 4 E4B
ollama pull gemma4:e4b

# Pull embedding model for local RAG
ollama pull nomic-embed-text

# Verify
ollama list
```

### 2. Python backend

```bash
cd backend

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy env file
cp .env.example .env
# Edit .env if needed (defaults work out of the box)
```

### 3. Next.js frontend

```bash
cd relief-relay-ui
npm install
# .env.local is already configured (NEXT_PUBLIC_API_URL=http://localhost:8000)
```

### 4. (Optional) Add relief policy documents to the RAG corpus

Drop any PDF or Markdown files into `backend/data/relief_docs/`. The included `relief_standards.md` covers triage, shelter, food, and medical standards based on the Sphere Handbook and WHO guidelines.

For better results, download the [Sphere Handbook 2018](https://spherestandards.org/handbook/) and drop it in.

Then build the index (run once):

```bash
cd backend
source .venv/bin/activate
python -c "from ai.rag import build_index; build_index()"
```

---

## Running the full stack

**3 terminals:**

```bash
# Terminal 1 — Ollama
ollama serve

# Terminal 2 — FastAPI backend
cd backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000

# Terminal 3 — Next.js frontend
cd relief-relay-ui
npm run dev
# → http://localhost:3000
```

---

## Project Structure

```
reliefRelay/
├── backend/
│   ├── main.py                # FastAPI entry point
│   ├── config.py              # Env vars & settings
│   ├── requirements.txt
│   ├── .env.example
│   ├── ai/
│   │   ├── gemma.py           # Gemma 4 client (text, vision, tools)
│   │   ├── extractor.py       # Multimodal field extraction + Pydantic
│   │   ├── rag.py             # ChromaDB + nomic-embed-text RAG
│   │   ├── agent.py           # Two-pass tool-calling agent loop
│   │   └── triage.py          # Triage scoring (GREEN/YELLOW/ORANGE/RED)
│   ├── api/
│   │   ├── intake.py          # POST /intake
│   │   ├── cases.py           # GET /cases, GET /cases/{id}
│   │   └── export.py          # GET /export/{case_id}/pdf
│   ├── tools/
│   │   ├── case_manager.py    # SQLite CRUD
│   │   ├── resource_lookup.py # Search local resource directory
│   │   └── pdf_export.py      # ReportLab PDF generation
│   └── data/
│       ├── relief_docs/       # SOP documents for RAG corpus
│       ├── resources/
│       │   └── directory.json # Sample shelter/food/medical resources
│       ├── chroma_db/         # Persisted vector store (auto-created)
│       └── cases.db           # SQLite case records (auto-created)
│
└── relief-relay-ui/           # Next.js 16 frontend
    └── src/
        ├── app/
        │   └── page.tsx       # Main intake dashboard
        ├── components/
        │   ├── IntakePanel.tsx    # Dropzone + voice + text input
        │   ├── TriageCard.tsx     # Color-coded triage + extracted fields
        │   ├── EvidenceRail.tsx   # RAG citations + tool audit log
        │   ├── ActionPacket.tsx   # Action plan + resources + PDF export
        │   └── CaseList.tsx       # Case history sidebar
        └── lib/
            ├── api.ts         # API client functions
            └── types.ts       # TypeScript interfaces
```

---

## API Reference

### `POST /intake`

Process a new intake. Accepts `multipart/form-data`:

| Field | Type | Description |
|---|---|---|
| `image` | File | Form photo (PNG/JPG) |
| `voice_text` | string | Voice note transcript |
| `manual_text` | string | Typed notes |

At least one field required. Image + voice can be combined (voice fills missing image fields).

**Response:**
```json
{
  "intake_record": { "name": "...", "medical_urgency": "high", ... },
  "case_id": "CASE-A1B2C3",
  "action_plan": "1. TRIAGE SUMMARY: ...",
  "resources": [...],
  "evidence": [{"content": "...", "source": "relief_standards.md"}],
  "tools_used": ["search_local_resources", "create_case"]
}
```

### `GET /cases`

List recent cases. Query param: `limit` (default 50).

### `GET /cases/{case_id}`

Get a specific case by ID.

### `GET /export/{case_id}/pdf`

Download a PDF referral packet for the case.

### `GET /health`

Health check endpoint.

---

## Configuration (`.env`)

```bash
OLLAMA_BASE_URL=http://localhost:11434
GEMMA_MODEL=gemma4:e4b          # or gemma4:e2b for 8GB machines
EMBED_MODEL=nomic-embed-text
CHROMA_PERSIST_DIR=./data/chroma_db
DOCS_DIR=./data/relief_docs
CASES_DB=./data/cases.db
VISUAL_TOKEN_BUDGET=560          # 280=fast, 560=standard, 1120=detailed
```

---

## Gemma 4 Inference Settings

Per Google DeepMind's recommended settings from the model card:

```python
{
    "temperature": 1.0,   # Do not change for tool calling
    "top_p": 0.95,
    "top_k": 64,
    "min_p": 0.0,
    "repeat_penalty": 1.0,
}
```

Visual token budgets:
- `280` — blurry/noisy photos
- `560` — standard form photos (default)
- `1120` — dense handwritten forms with small text

---

## License

Apache 2.0 — free to use, deploy, and modify.

---

*Built with Gemma 4 E4B · ChromaDB · FastAPI · Next.js · 100% offline-capable*
