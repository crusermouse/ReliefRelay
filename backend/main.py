from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import aiofiles, shutil, uuid
from pathlib import Path
from ai.extractor import extract_from_image, extract_from_voice, extract_from_text
from ai.rag import load_index, retrieve, generate_grounded_plan
from ai.agent import run_intake_agent
from ai.gemma import chat_text
from tools.pdf_export import generate_pdf
from tools.case_manager import list_cases, get_case

app = FastAPI(title="ReliefRelay API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load RAG index at startup (persisted — loads in seconds)
vector_store = None


@app.on_event("startup")
async def startup():
    global vector_store
    vector_store = load_index()
    print("✓ ReliefRelay API ready")


# ── MAIN INTAKE ENDPOINT ───────────────────────────────────────────────
@app.post("/intake")
async def process_intake(
    image: UploadFile = File(None),       # Optional form photo
    voice_text: str = Form(""),           # Optional voice transcript
    manual_text: str = Form(""),          # Optional typed notes
):
    """
    Accepts: form image + voice transcript + manual text
    Returns: extracted record, triage level, action plan, resources, evidence
    """
    intake_record = None

    # Step 1: Extract structured data from input
    if image and image.filename:
        tmp_path = f"/tmp/{uuid.uuid4()}_{image.filename}"
        async with aiofiles.open(tmp_path, "wb") as f:
            await f.write(await image.read())
        intake_record = extract_from_image(tmp_path)
        Path(tmp_path).unlink(missing_ok=True)

    if voice_text and not intake_record:
        intake_record = extract_from_voice(voice_text)
    elif voice_text and intake_record:
        # Merge voice data into image-extracted data to fill gaps
        voice_data = extract_from_voice(voice_text)
        for field, val in voice_data.dict().items():
            if val and not getattr(intake_record, field):
                setattr(intake_record, field, val)

    if manual_text and not intake_record:
        intake_record = extract_from_text(manual_text)
    elif manual_text and intake_record:
        text_data = extract_from_text(manual_text)
        for field, val in text_data.dict().items():
            if val and not getattr(intake_record, field):
                setattr(intake_record, field, val)

    if not intake_record:
        raise HTTPException(400, "No valid input provided. Supply an image, voice_text, or manual_text.")

    intake_dict = intake_record.dict()

    # Step 2: Retrieve relevant policy chunks
    query = f"{intake_record.medical_urgency} urgency {' '.join(intake_record.presenting_issues)}"
    retrieved = retrieve(query, vector_store, k=4)
    rag_context = "\n\n".join([f"[{r['source']}] {r['content']}" for r in retrieved])

    # Step 3: Run the agent (tool calling + action plan generation)
    agent_result = await run_intake_agent(intake_dict, rag_context)

    return {
        "intake_record": intake_dict,
        "case_id": agent_result["case_id"],
        "action_plan": agent_result["action_plan"],
        "resources": agent_result["resources_found"],
        "evidence": retrieved,                    # For transparency rail in UI
        "tools_used": agent_result["tool_calls_made"],  # For audit display
    }


# ── CASES ──────────────────────────────────────────────────────────────
@app.get("/cases")
async def get_cases(limit: int = 50):
    """Return the most recent cases, newest first."""
    cases = list_cases(limit=limit)
    return {"cases": cases, "total": len(cases)}


@app.get("/cases/{case_id}")
async def get_case_by_id(case_id: str):
    """Return a single case by ID."""
    case = get_case(case_id)
    if not case:
        raise HTTPException(404, f"Case {case_id} not found")
    return case


# ── EXPORT ────────────────────────────────────────────────────────────
@app.get("/export/{case_id}/pdf")
async def export_case_pdf(case_id: str):
    case = get_case(case_id)
    if not case:
        raise HTTPException(404, f"Case {case_id} not found")
    pdf_path = generate_pdf(case_id)
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"relief_case_{case_id}.pdf",
    )


# ── HEALTH CHECK ──────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


# Run: uvicorn main:app --reload --port 8000
