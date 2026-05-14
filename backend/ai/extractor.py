import json
import re
from pydantic import BaseModel, Field
from typing import Optional, Literal
from ai.gemma import chat_vision, chat_text, OllamaUnavailableError

# ── OUTPUT SCHEMA (Pydantic validates Gemma's JSON output) ─────────────
class IntakeRecord(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    location_found: Optional[str] = None
    presenting_issues: list[str] = Field(default_factory=list)
    medical_urgency: Literal["none", "low", "medium", "high", "critical"] = "none"
    shelter_needed: bool = False
    food_needed: bool = False
    water_needed: bool = False
    medication_needed: Optional[str] = None
    family_members: int = 1
    special_needs: Optional[str] = None
    language_preference: str = "English"
    missing_information: list[str] = Field(default_factory=list)
    extraction_confidence: Literal["low", "medium", "high"] = "low"
    raw_transcription: Optional[str] = None


def _fallback_intake_from_text(text: str) -> IntakeRecord:
    lowered = text.lower()

    issues: list[str] = []
    keyword_map = {
        "chest pain": "chest pain",
        "breathing": "difficulty breathing",
        "bleeding": "bleeding",
        "burn": "burns",
        "dehydration": "dehydration",
        "fever": "fever",
        "injury": "injury",
        "pain": "pain",
    }
    for keyword, label in keyword_map.items():
        if keyword in lowered and label not in issues:
            issues.append(label)

    if any(term in lowered for term in ["chest pain", "unconscious", "not breathing", "severe bleeding", "difficulty breathing"]):
        urgency = "critical"
    elif any(term in lowered for term in ["urgent", "severe", "needs doctor", "needs medical", "hospital"]):
        urgency = "high"
    elif any(term in lowered for term in ["shelter", "food", "water", "needs help", "support"]):
        urgency = "medium"
    else:
        urgency = "low" if issues else "none"

    family_match = re.search(r"\b(\d{1,2})\s*(?:people|persons|family|famil(?:y|ies))\b", lowered)
    family_members = int(family_match.group(1)) if family_match else 1

    return IntakeRecord(
        presenting_issues=issues,
        medical_urgency=urgency,  # type: ignore[arg-type]
        shelter_needed=any(term in lowered for term in ["shelter", "evacuate", "evacuation"]),
        food_needed="food" in lowered,
        water_needed=any(term in lowered for term in ["water", "dehydration"]),
        family_members=family_members,
        missing_information=["name", "age", "location_found"],
        extraction_confidence="low",
        raw_transcription=text,
    )


# ── EXTRACTION SYSTEM PROMPT ───────────────────────────────────────────
EXTRACTION_SYSTEM = """You are a disaster relief intake specialist AI.
Your job is to extract structured data from intake forms, voice transcriptions,
and photos — even when they are messy, partially filled, or handwritten.

RULES:
- Extract ONLY what you can clearly see or hear. Do not invent data.
- If a field is unclear, set it to null and add it to missing_information.
- medical_urgency must be set to one of: none, low, medium, high, critical
- critical = bleeding / unconscious / chest pain / severe difficulty breathing
- high = needs medical attention within 1-2 hours
- medium = needs attention today
- low = stable, needs basic resources only
- Output ONLY valid JSON matching the schema. No preamble, no commentary."""

EXTRACTION_PROMPT_IMAGE = """Analyze this disaster relief intake form image.
Extract all visible information and return a JSON object with these fields:
name, age, gender, location_found, presenting_issues (list), medical_urgency,
shelter_needed, food_needed, water_needed, medication_needed, family_members,
special_needs, language_preference, missing_information (list of unclear/absent fields),
extraction_confidence, raw_transcription (verbatim text from the form).

Return ONLY the JSON object."""


async def extract_from_image(image_path: str) -> IntakeRecord:
    """Run Gemma 4 vision on a form image and parse the structured output."""
    raw = await chat_vision(
        prompt=EXTRACTION_PROMPT_IMAGE,
        image_path=image_path,
        system=EXTRACTION_SYSTEM,
        detail="high",
        json_mode=True,
    )
    try:
        text = raw.strip().removeprefix("```json").removesuffix("```").strip()
        data = json.loads(text)
        return IntakeRecord(**data)
    except Exception as e:
        # Fallback: ask Gemma to correct its own output (one retry only)
        fix_prompt = (
            f"Fix this invalid JSON to match the IntakeRecord schema:\n{raw}\n"
            f"Error: {e}\nReturn ONLY valid JSON."
        )
        fixed = await chat_text(fix_prompt, json_mode=True)
        try:
            return IntakeRecord(**json.loads(fixed))
        except Exception as fallback_err:
            raise ValueError(
                f"Failed to extract intake record after retry: {fallback_err}"
            ) from fallback_err


async def extract_from_voice(transcription: str) -> IntakeRecord:
    """Extract structured data from a voice note transcription."""
    prompt = f"""Voice note transcription from a relief intake:
---
{transcription}
---
Extract the intake information and return a JSON object."""
    try:
        raw = await chat_text(prompt, system=EXTRACTION_SYSTEM, json_mode=True)
        return IntakeRecord(**json.loads(raw))
    except (OllamaUnavailableError, Exception):
        return _fallback_intake_from_text(transcription)


async def extract_from_text(manual_text: str) -> IntakeRecord:
    """Extract structured data from manually entered text notes."""
    prompt = f"""Manually entered relief intake notes:
---
{manual_text}
---
Extract the intake information and return a JSON object."""
    try:
        raw = await chat_text(prompt, system=EXTRACTION_SYSTEM, json_mode=True)
        return IntakeRecord(**json.loads(raw))
    except (OllamaUnavailableError, Exception):
        return _fallback_intake_from_text(manual_text)
