from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from fastapi.responses import FileResponse
import aiofiles, uuid
from pathlib import Path
from ai.extractor import extract_from_image, extract_from_voice, extract_from_text
from ai.rag import retrieve, generate_grounded_plan
from ai.agent import run_intake_agent
from ai.gemma import chat_text
from tools.pdf_export import generate_pdf

router = APIRouter()


@router.post("/intake")
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

    # Step 2: Retrieve relevant policy chunks (injected by main.py startup)
    from main import vector_store
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


@router.post("/demo-intake")
async def demo_intake(demo_id: str = Form(...)):
    """
    Returns pre-cached demo case for instant display (no inference).
    Used by frontend for live demos without waiting for Gemma 4 inference.
    
    Args:
        demo_id: One of 'earthquake-critical', 'refugee-camp-moderate', 'recovery-phase-low'
    """
    import json
    from pathlib import Path
    
    demo_dir = Path(__file__).parent.parent.parent / "relief-relay-ui" / "public" / "demo-cache"
    valid_demos = ["earthquake-critical", "refugee-camp-moderate", "recovery-phase-low"]
    
    if demo_id not in valid_demos:
        raise HTTPException(400, f"Invalid demo_id. Must be one of: {', '.join(valid_demos)}")
    
    demo_file = demo_dir / f"{demo_id}.json"
    if not demo_file.exists():
        raise HTTPException(500, f"Demo file not found: {demo_file}")
    
    with open(demo_file, "r") as f:
        return json.load(f)
