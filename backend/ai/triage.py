from typing import Literal

Triage = Literal["GREEN", "YELLOW", "ORANGE", "RED"]

def score_triage(
    medical_urgency: str,          # "none"|"low"|"medium"|"high"|"critical"
    shelter_needed: bool,
    food_needed: bool,
    water_needed: bool,
    family_members: int,
    special_needs: str | None,
) -> Triage:
    # Medical urgency is the primary determinant
    if medical_urgency == "critical":
        return "RED"
    if medical_urgency == "high":
        return "ORANGE"

    # Accumulate secondary risk points
    score = 0
    if medical_urgency == "medium":
        score += 2
    if shelter_needed:
        score += 1
    if food_needed:
        score += 1
    if water_needed:
        score += 1
    if family_members >= 3:
        score += 1
    if special_needs and special_needs.strip():
        score += 2

    if score >= 5:
        return "ORANGE"
    if score >= 2:
        return "YELLOW"
    return "GREEN"
