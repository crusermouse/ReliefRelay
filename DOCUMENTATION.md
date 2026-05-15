# ReliefRelay — Technical Documentation

> **Offline-first disaster relief intake copilot** powered by Gemma 4 running entirely on-device via Ollama.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Repository Structure](#4-repository-structure)
5. [Backend Deep Dive](#5-backend-deep-dive)
6. [Frontend Deep Dive](#6-frontend-deep-dive)
7. [AI Pipeline](#7-ai-pipeline)
8. [Data Models](#8-data-models)
9. [API Reference](#9-api-reference)
10. [Configuration](#10-configuration)
11. [Local Setup](#11-local-setup)
12. [Known Constraints & Tradeoffs](#12-known-constraints--tradeoffs)

---

## 1. Project Overview

ReliefRelay is a field-deployable disaster relief intake tool designed for environments with no internet access. A volunteer photographs a handwritten intake form, speaks a voice note, or types notes into the interface. The system processes the input entirely on-device and produces:

- A **structured intake record** (name, age, medical urgency, needs)
- A **triage classification** (GREEN / YELLOW / ORANGE / RED)
- **Relevant policy citations** retrieved from a local corpus (Sphere Handbook, WHO guidelines)
- An **AI-generated action plan** with next steps and resource referrals
- A **printable PDF referral packet** ready to hand to the family

**No cloud. No API keys. No internet required.**

---

## 2. System Architecture

```
Volunteer Input (Image / Voice / Text)
          │
          ▼
  Next.js UI — port 3000
          │  POST /intake (multipart/form-data)
          ▼
  FastAPI Backend — port 8000
          │
          ├─► Gemma 4 Vision (Ollama) ──► IntakeRecord (Pydantic JSON)
          │
          ├─► ChromaDB RAG ──────────────► top-4 policy chunks
          │     └─ nomic-embed-text embeddings
          │
          ├─► Gemma 4 Agent (two-pass tool calling)
          │     ├─ search_local_resources() → directory.json
          │     └─ create_case()           → SQLite
          │
          └─► Action Plan + Evidence Rail + PDF Export
                    │
                    ▼
           ReportLab PDF ──► /export/{case_id}/pdf
```

### Key Design Decisions

| Decision | Rationale |
|---|---|
| Ollama for inference | Single binary, runs offline, GPU/CPU adaptive |
| Gemma 4 (8B Q4_K_M) | Best-in-class multimodal + function calling at 9.6 GB |
| ChromaDB (persisted) | Zero-dependency local vector store, loads in <1s on warm runs |
| SQLite for cases | File-based, zero config, survives reboots |
| FastAPI + async | Handles long Gemma inference without blocking the event loop |
| Next.js 16 (App Router) | SSR with client components, Turbopack dev mode |

---

## 3. Tech Stack

### Backend
| Layer | Technology | Version |
|---|---|---|
| Runtime | Python | 3.11+ |
| API framework | FastAPI | 0.136+ |
| ASGI server | Uvicorn | 0.46+ |
| LLM client | Ollama Python SDK | 0.6+ |
| LLM | Gemma 4 (gemma4:latest) | 8B Q4_K_M |
| Embeddings | nomic-embed-text | 137M F16 |
| Vector store | ChromaDB | 1.5+ |
| ORM / DB | SQLite (stdlib) | — |
| PDF generation | ReportLab | 4.2+ |
| Validation | Pydantic v2 | 2.7+ |
| HTTP client | httpx | 0.27+ |
| Document loading | LangChain Community | 0.4+ |

### Frontend
| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js | 16.2.6 |
| Language | TypeScript | 5+ |
| Styling | Tailwind CSS | v4 |
| Animation | Framer Motion | 12+ |
| Icons | Lucide React | 1.14+ |
| File upload | react-dropzone | 15+ |
| Notifications | react-hot-toast | 2.6+ |

---

## 4. Repository Structure

```
ReliefRelay/
├── .gitignore                  # Excludes venv, .env, pycache, chroma_db
├── pyrightconfig.json          # IDE: points Pylance to backend/.venv
├── README.md                   # Quick-start guide
├── DOCUMENTATION.md            # This file
│
├── backend/
│   ├── main.py                 # FastAPI app, lifespan, all endpoints
│   ├── config.py               # Pydantic Settings (reads .env)
│   ├── requirements.txt        # Python dependencies
│   ├── .env.example            # Template — copy to .env
│   │
│   ├── ai/
│   │   ├── gemma.py            # Ollama client: chat_text, chat_vision, chat_with_tools
│   │   ├── extractor.py        # Multimodal field extraction → IntakeRecord
│   │   ├── rag.py              # ChromaDB build/load/retrieve
│   │   └── agent.py            # Two-pass tool-calling agent loop
│   │
│   ├── api/                    # (route modules, included via main.py)
│   │   ├── intake.py
│   │   ├── cases.py
│   │   └── export.py
│   │
│   ├── tools/
│   │   ├── case_manager.py     # SQLite CRUD (create, update, get, list)
│   │   ├── resource_lookup.py  # Search directory.json by type/location
│   │   └── pdf_export.py       # ReportLab PDF packet generation
│   │
│   └── data/
│       ├── relief_docs/        # SOPs for RAG (drop PDFs/Markdown here)
│       │   └── relief_standards.md
│       ├── resources/
│       │   └── directory.json  # Local shelter/food/medical directory
│       ├── chroma_db/          # Persisted vector store (auto-created)
│       └── cases.db            # SQLite case records (auto-created)
│
└── relief-relay-ui/            # Next.js 16 frontend
    ├── src/
    │   ├── app/
    │   │   └── page.tsx        # Main dashboard (single page)
    │   ├── components/
    │   │   ├── IntakePanel.tsx          # Image/Voice/Text input tabs
    │   │   ├── TriageCard.tsx           # Color-coded triage + fields
    │   │   ├── EvidenceRail.tsx         # RAG citations + tool audit
    │   │   ├── ActionPacket.tsx         # Action plan + PDF export
    │   │   ├── CaseList.tsx             # Historical case sidebar
    │   │   ├── CaseActivityFeed.tsx     # Live event feed
    │   │   ├── LiveReasoningTimeline.tsx# Workflow stage tracker
    │   │   ├── CrisisOperationsMap.tsx  # Simulated geo map
    │   │   ├── ImpactDashboard.tsx      # Animated metric counters
    │   │   └── OfflineModeOverlay.tsx   # Degraded state overlay
    │   └── lib/
    │       ├── api.ts           # Typed fetch wrappers for all endpoints
    │       └── types.ts         # TypeScript interfaces
    └── .env.local               # NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

---

## 5. Backend Deep Dive

### `main.py` — Application Entry Point

The FastAPI app uses an `asynccontextmanager` lifespan to initialize services at startup:

1. **Load ChromaDB index** — loads in <1s if already persisted
2. **Probe Ollama** — lightweight HTTP check to `/api/tags`
3. **Probe model availability** — confirms `gemma4:latest` is listed
4. Reports combined `service_status` to all health/status endpoints

**CORS** is configured to allow `http://localhost:3000` only.

**Input validation** enforces:
- Max image upload: 10 MB
- Allowed image types: `image/jpeg`, `image/png`, `image/webp`
- Max text input: 25,000 characters

**Temporary file handling**: uploaded images are written to `/tmp/{uuid}{ext}`, processed, then deleted in a `finally` block.

---

### `ai/gemma.py` — Ollama Client

All LLM calls go through this module. Three main async functions:

| Function | Use | Notes |
|---|---|---|
| `chat_text(prompt, system)` | Text-only inference | JSON mode supported |
| `chat_vision(prompt, image_path)` | Multimodal (image + text) | Base64-encodes image; `visual_token_budget` controls detail |
| `chat_with_tools(messages, tools)` | Native function calling | Returns raw message for caller to parse `tool_calls` |

**Concurrency guard**: `asyncio.Semaphore(1)` prevents parallel Gemma inferences that would spike memory beyond 16 GB.

**Timeout**: All calls wrapped in `asyncio.wait_for(..., timeout=120s)`.

**Visual token budgets** (Gemma 4 native):
- `280` — fast scan, low detail
- `560` — standard form photos (default)
- `1120` — dense handwritten forms

---

### `ai/extractor.py` — Multimodal Field Extraction

Extracts a structured `IntakeRecord` from any input modality:

```
Image  ──► chat_vision (json_mode=True) ──► IntakeRecord
Voice  ──► chat_text   (json_mode=True) ──► IntakeRecord
Text   ──► chat_text   (json_mode=True) ──► IntakeRecord
```

**Self-healing JSON**: If Gemma returns malformed JSON, the extractor makes one retry asking the model to fix its own output. If that also fails, a **regex/keyword fallback** `_fallback_intake_from_text()` produces a partial record with `extraction_confidence: "low"`.

**IntakeRecord fields:**

| Field | Type | Description |
|---|---|---|
| `name` | str? | Survivor name |
| `age` | int? | Age in years |
| `medical_urgency` | enum | `none/low/medium/high/critical` |
| `presenting_issues` | list[str] | Symptoms / conditions |
| `shelter_needed` | bool | Requires shelter |
| `food_needed` | bool | Requires food |
| `water_needed` | bool | Requires water |
| `family_members` | int | Number of people in group |
| `extraction_confidence` | enum | `low/medium/high` |
| `missing_information` | list[str] | Fields the model couldn't extract |

---

### `ai/rag.py` — Retrieval-Augmented Generation

**Index build** (run once):
1. Loads all `.pdf` and `.md` files from `data/relief_docs/`
2. Chunks at 500 tokens with 80-token overlap
3. Embeds with `nomic-embed-text` via Ollama
4. Persists to ChromaDB at `data/chroma_db/`

**Retrieval**: Returns top-4 chunks by cosine similarity to a query constructed from `"{urgency} urgency {presenting_issues}"`.

**Output format**: `[{"content": "...", "source": "relief_standards.md"}]` — fed to the agent and returned to the UI for the evidence rail.

---

### `ai/agent.py` — Two-Pass Tool-Calling Agent

Implements the Gemma 4 native function calling pattern:

**Pass 1** — Tool selection:
```
System prompt + intake record + policy context
        ↓
Gemma 4 → tool_calls: [search_local_resources(...), create_case(...)]
```

**Pass 2** — Action plan generation:
```
Tool results appended to message history
        ↓
Gemma 4 → Final action plan text
```

**Available tools:**

| Tool | Description |
|---|---|
| `search_local_resources` | Searches `directory.json` by type (shelter/food/medical/transport/escalation), location keyword, and family size |
| `create_case` | Writes intake record + triage level to SQLite, returns `CASE-XXXXXX` ID |

**Fallback**: If Gemma is unavailable, the agent falls back to rule-based resource lookup + a templated action plan. The case is still persisted.


### `tools/case_manager.py` — SQLite CRUD

Schema:
```sql
CREATE TABLE cases (
    case_id      TEXT PRIMARY KEY,   -- "CASE-A1B2C3"
    triage_level TEXT NOT NULL,      -- "RED" | "ORANGE" | "YELLOW" | "GREEN"
    intake_data  TEXT NOT NULL,      -- JSON blob
    action_plan  TEXT,               -- Generated text (updated after Pass 2)
    created_at   TEXT NOT NULL,      -- ISO 8601 UTC
    updated_at   TEXT NOT NULL
)
```

Case IDs: `CASE-` + first 6 hex chars of UUID4, uppercased.

---

### `tools/pdf_export.py` — PDF Referral Packet

Uses ReportLab to generate a print-ready A4 packet containing:
- Case ID, triage level badge, timestamp
- All extracted intake fields
- Full AI-generated action plan
- Resource referrals with addresses and phone numbers
- Evidence citations from the RAG corpus

---

## 6. Frontend Deep Dive

### State Management (`page.tsx`)

Single-page React app using `useState`/`useEffect` hooks:

| State | Type | Purpose |
|---|---|---|
| `result` | `IntakeResponse \| null` | Latest processed intake |
| `cases` | `Case[]` | Historical case list |
| `loadingStep` | `LoadingStep` | Controls workflow timeline display |
| `health` | `HealthResponse \| null` | Backend/Ollama status |
| `isOnline` | `boolean` | Browser `navigator.onLine` |
| `backendReachable` | `boolean` | Whether `/health` responded |

**Health polling**: On mount, fetches `/health` and `/cases`. Listens to `online`/`offline` browser events.

### Component Responsibilities

| Component | Responsibility |
|---|---|
| `IntakePanel` | Three-tab input (Image dropzone / Voice recorder / Text textarea), submits to `/intake` |
| `TriageCard` | Color-coded card showing extracted fields; urgency → triage level mapping |
| `ActionPacket` | Renders action plan, workflow stages, resources, PDF download button |
| `EvidenceRail` | Shows RAG citation chunks with source filenames + tool audit log |
| `CaseList` | Scrollable sidebar of historical cases with triage badges and timestamps |
| `LiveReasoningTimeline` | Animated stage-by-stage progress display during processing |
| `CrisisOperationsMap` | Simulated animated map of active incident zones |
| `ImpactDashboard` | Animated counter metrics (people assisted, escalations, etc.) |
| `CaseActivityFeed` | Live scrolling feed of case events |
| `OfflineModeOverlay` | Full-screen overlay when network/backend/Ollama is degraded |

### Hydration Safety

All components that use time-dependent values (`Date`, locale-formatted strings) implement a `mounted` guard:

```tsx
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
// render placeholder until mounted, then show real value
```

Time formatting uses a deterministic manual formatter (not `toLocaleTimeString`) to ensure SSR and client output match exactly.

---

## 7. AI Pipeline

### Full Happy Path

```
1. Volunteer uploads form photo
2. FastAPI receives multipart POST /intake
3. Image saved to /tmp, passed to extract_from_image()
4. Gemma 4 vision: reads form, returns JSON → IntakeRecord (Pydantic)
5. Query built: "{urgency} urgency {issues}"
6. ChromaDB retrieves top-4 policy chunks
7. Agent Pass 1: Gemma calls search_local_resources + create_case
8. Tools execute locally (directory.json search + SQLite write)
9. Tool results appended to message history
10. Agent Pass 2: Gemma generates action plan text
11. Case updated in SQLite with action plan
12. Response returned: intake_record + case_id + action_plan + resources + evidence
13. Frontend renders TriageCard + ActionPacket + EvidenceRail
14. Volunteer clicks "Export PDF" → /export/{case_id}/pdf → ReportLab packet
```

### Degraded Path (Gemma Unavailable)

```
1-6. Same as above
7. chat_with_tools() fails / times out
8. model_available = False
9. Rule-based resource lookup runs directly (no LLM)
10. _build_fallback_action_plan() produces templated text
11. Case still persisted to SQLite
12. Response returned with operational_mode: "degraded"
13. Frontend shows same UI (degraded banner visible)
```

---

## 8. Data Models

### IntakeRecord (Python / TypeScript)

```typescript
interface IntakeRecord {
  name?: string;
  age?: number;
  gender?: string;
  location_found?: string;
  presenting_issues: string[];
  medical_urgency: "none" | "low" | "medium" | "high" | "critical";
  shelter_needed: boolean;
  food_needed: boolean;
  water_needed: boolean;
  medication_needed?: string;
  family_members: number;
  special_needs?: string;
  language_preference: string;
  missing_information: string[];
  extraction_confidence: "low" | "medium" | "high";
  raw_transcription?: string;
}
```

### IntakeResponse (API → Frontend)

```typescript
interface IntakeResponse {
  intake_record: IntakeRecord;
  case_id: string;              // "CASE-A1B2C3"
  action_plan: string;          // Full AI-generated text
  resources: Record<string, unknown>;  // Keyed by resource type
  evidence: EvidenceChunk[];    // RAG citations
  tools_used: string[];         // ["search_local_resources", "create_case"]
  workflow_events?: WorkflowEvent[];
  operational_mode?: "full" | "degraded";
}
```

---

## 9. API Reference

### `POST /intake`

Process a new intake. `multipart/form-data`:

| Field | Type | Required | Description |
|---|---|---|---|
| `image` | File | No* | Form photo (PNG/JPG/WEBP, max 10MB) |
| `voice_text` | string | No* | Voice note transcript |
| `manual_text` | string | No* | Typed notes (max 25,000 chars) |

*At least one field required. Multiple inputs are merged (voice fills gaps from image extraction).

**Response:** `IntakeResponse` JSON (see above)

**Error codes:**
- `400` — No valid input supplied
- `413` — File or text too large
- `503` — Extraction or agent failed in degraded mode

---

### `GET /cases?limit=50`

Returns `{ cases: Case[], total: number }` ordered newest-first.

---

### `GET /cases/{case_id}`

Returns a single `Case` record. `404` if not found.

---

### `GET /export/{case_id}/pdf`

Streams a ReportLab PDF. `Content-Disposition: attachment`. Case ID must match `CASE-[0-9A-F]{6}`.

---

### `GET /health`

```json
{
  "status": "operational",
  "version": "1.0.0",
  "services": {
    "backend": "ready",
    "vector_store": "ready",
    "ollama": "ready",
    "mode": "operational"
  }
}
```

`status` is `"operational"` when all services report `"ready"`. Anything else triggers the frontend degraded overlay.

---

## 10. Configuration

All settings live in `backend/.env` (gitignored). Defaults are in `config.py`.

| Variable | Default | Description |
|---|---|---|
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API base |
| `GEMMA_MODEL` | `gemma4:latest` | Model tag |
| `EMBED_MODEL` | `nomic-embed-text:latest` | Embedding model |
| `CHROMA_PERSIST_DIR` | `./data/chroma_db` | ChromaDB storage path |
| `DOCS_DIR` | `./data/relief_docs` | SOP document directory |
| `CASES_DB` | `./data/cases.db` | SQLite path |
| `VISUAL_TOKEN_BUDGET` | `560` | Gemma 4 image detail (280/560/1120) |
| `GEMMA_MAX_TOKENS` | `1024` | Max output tokens per call |
| `GEMMA_REQUEST_TIMEOUT` | `120` | Seconds before inference timeout |
| `GEMMA_MAX_CONCURRENCY` | `1` | Parallel inference limit |
| `GEMMA_WARMUP` | `False` | Pre-load model at startup (disable for large models) |
| `GEMMA_DETERMINISTIC` | `True` | Sets temperature=0 for reproducible output |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | `""` | Required for Crisis Operations Map |

---

## 11. Local Setup

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Ollama | 0.6.x+ | [ollama.com](https://ollama.com) |
| Python | 3.11+ | [python.org](https://python.org) |
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| RAM | 12 GB+ | 16 GB recommended |

### Step 1 — Pull Models

```bash
ollama pull gemma4:latest       # 9.6 GB — main model
ollama pull nomic-embed-text    # 274 MB — embeddings
```

### Step 2 — Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux

pip install -r requirements.txt
cp .env.example .env

# Build RAG index (run once)
python -c "from ai.rag import build_index; build_index()"

# Start server
uvicorn main:app --reload --port 8000
```

### Step 3 — Frontend

```bash
cd relief-relay-ui
npm install
# .env.local already contains: NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
npm run dev
# → http://localhost:3000
```

### Adding More Policy Documents

Drop any `.pdf` or `.md` file into `backend/data/relief_docs/`, then rebuild the index:

```bash
python -c "from ai.rag import build_index; build_index()"
```

Recommended: [Sphere Handbook 2018](https://spherestandards.org/handbook/) (free PDF).

---

## 12. Known Constraints & Tradeoffs

| Constraint | Notes |
|---|---|
| **Inference latency** | 9.6 GB model on CPU: 30–90s per intake. GPU reduces to 5–15s. |
| **Single concurrency** | Semaphore limits to 1 parallel Gemma call — queues on multi-user load |
| **Warmup disabled** | `GEMMA_WARMUP=False` — first request cold-loads the model |
| **No auth** | CORS allows localhost:3000 only; no user authentication layer |
| **SQLite** | Not suitable for multi-process deployment; use PostgreSQL for production |
| **RAG corpus** | Ships with one seed document; quality improves significantly with Sphere Handbook added |
| **Windows terminals** | Python prints use ASCII-safe strings (box-drawing chars cause `cp1252` errors) |
| **Hydration** | Next.js SSR + client-side time values require `mounted` guard; locale formatters avoided |

---

*Built for the Gemma 4 Hackathon · Apache 2.0 License*
