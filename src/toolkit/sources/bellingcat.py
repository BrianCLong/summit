from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from src.toolkit.normalize import normalize_registry

SNAPSHOT: list[dict[str, Any]] = [
    {
        "tool_id": "archive-org-wayback",
        "name": "Wayback Machine",
        "primary_url": "https://web.archive.org/",
        "categories": ["archiving", "web_archive"],
        "capabilities": ["archiving", "web_archive_lookup"],
        "access": {
            "auth_required": False,
            "cost": "free",
            "api_available": True,
            "network_required": True,
            "rate_limits_known": False,
        },
        "risk": {"tos_sensitivity": "low", "pii_risk": "low", "abuse_risk": "low"},
        "limitations": ["Archived snapshots may be delayed or unavailable."],
        "inputs": ["url"],
        "outputs": ["archive_url", "snapshot_status"],
    },
    {
        "tool_id": "google-images",
        "name": "Google Images",
        "primary_url": "https://images.google.com/",
        "categories": ["reverse-image"],
        "capabilities": ["reverse_image_search"],
        "access": {
            "auth_required": False,
            "cost": "free",
            "api_available": False,
            "network_required": True,
            "rate_limits_known": False,
        },
        "risk": {
            "tos_sensitivity": "high",
            "pii_risk": "medium",
            "abuse_risk": "medium",
            "notes": "Manual use recommended in MWS mode.",
        },
        "limitations": ["Automated scraping may violate terms."],
        "inputs": ["image_url"],
        "outputs": ["similar_images", "matching_pages"],
    },
    {
        "tool_id": "suncalc",
        "name": "SunCalc",
        "primary_url": "https://suncalc.org/",
        "categories": ["chronolocation", "geolocation"],
        "capabilities": ["chronolocation_solar"],
        "access": {
            "auth_required": False,
            "cost": "free",
            "api_available": False,
            "network_required": True,
            "rate_limits_known": False,
        },
        "risk": {
            "tos_sensitivity": "low",
            "pii_risk": "low",
            "abuse_risk": "low",
            "notes": "User-supplied location/time.",
        },
        "limitations": ["Requires approximate location; results depend on accurate coordinates."],
        "inputs": ["lat", "lon", "date_time"],
        "outputs": ["sun_azimuth", "sun_altitude"],
    },
]


def write_normalized_snapshot(output_path: str | Path) -> list[dict[str, Any]]:
    normalized = normalize_registry(SNAPSHOT)
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(normalized, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return normalized
