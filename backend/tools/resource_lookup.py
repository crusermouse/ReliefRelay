import json
from pathlib import Path
from config import settings


def search_resources(
    resource_type: str,
    location: str = "",
    family_size: int = 1,
) -> list[dict]:
    """
    Search the local resource directory JSON for matching resources.
    Filters by resource_type; optionally scores by location proximity.
    """
    resources_dir = Path(settings.DOCS_DIR).parent / "resources"
    directory_file = resources_dir / "directory.json"

    if not directory_file.exists():
        return []

    with open(directory_file) as f:
        all_resources: list[dict] = json.load(f)

    # Filter by resource type
    matches = [r for r in all_resources if r.get("type") == resource_type]

    # Simple keyword match on location if provided
    if location:
        location_lower = location.lower()
        scored = []
        for r in matches:
            area = (r.get("area", "") + " " + r.get("address", "")).lower()
            score = 1 if location_lower in area else 0
            scored.append((score, r))
        scored.sort(key=lambda x: x[0], reverse=True)
        matches = [r for _, r in scored]

    # Filter by capacity if family_size provided
    if family_size > 1:
        matches = [
            r for r in matches
            if r.get("capacity", 999) >= family_size or r.get("capacity") is None
        ]

    return matches[:5]  # Return top 5 results
