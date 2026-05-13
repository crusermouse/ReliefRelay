from typing import Literal

TriageLevel = Literal["GREEN", "YELLOW", "ORANGE", "RED"]

# Score thresholds
TRIAGE_MATRIX = {
    "critical": "RED",
    "high": "ORANGE",
    "medium": "YELLOW",
    "low": "GREEN",
    "none": "GREEN",
}


def score_triage(
    medical_urgency: str,
    shelter_needed: bool = False,
    food_needed: bool = False,
    water_needed: bool = False,
    family_members: int = 1,
    special_needs: str | None = None,
) -> dict:
    """
    Compute triage priority level based on medical urgency and needs.
    Returns a dict with triage_level, score (1–5), and rationale.
    """
    # Base level from medical urgency
    base_level = TRIAGE_MATRIX.get(medical_urgency, "GREEN")

    # Compute numeric score
    score_map = {"RED": 5, "ORANGE": 4, "YELLOW": 3, "GREEN": 1}
    score = score_map[base_level]

    # Upgrade score if multiple compounding factors present
    compounding = sum([
        shelter_needed,
        food_needed,
        water_needed,
        bool(special_needs),
        family_members > 3,
    ])

    if compounding >= 3 and base_level == "YELLOW":
        base_level = "ORANGE"
        score = 4
    elif compounding >= 4 and base_level == "ORANGE":
        base_level = "RED"
        score = 5

    level_colors = {
        "RED": "#ef4444",
        "ORANGE": "#f97316",
        "YELLOW": "#f59e0b",
        "GREEN": "#22c55e",
    }

    level_labels = {
        "RED": "Critical — Immediate intervention required",
        "ORANGE": "High — Urgent attention needed within 1-2 hours",
        "YELLOW": "Medium — Needs attention today",
        "GREEN": "Stable — Standard resource allocation",
    }

    return {
        "triage_level": base_level,
        "score": score,
        "color": level_colors[base_level],
        "label": level_labels[base_level],
        "factors": {
            "medical_urgency": medical_urgency,
            "compounding_needs": compounding,
            "family_members": family_members,
        },
    }
