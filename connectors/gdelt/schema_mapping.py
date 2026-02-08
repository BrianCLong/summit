"""
GDELT GKG Schema Mapping

Maps GDELT Global Knowledge Graph (GKG) V2 records to IntelGraph Cognitive Domain entities.
"""

import re
from typing import Any, Dict, List, Tuple

# GDELT GKG V2 Column indices
GKG_RECORD_ID = 0
GKG_DATE = 1
GKG_DOCUMENT_IDENTIFIER = 4
GKG_THEMES = 7
GKG_PERSONS = 11
GKG_ORGANIZATIONS = 13
GKG_TONE = 15
GKG_EXTRAS = 26


def extract_page_title(extras: str) -> str:
    """Extracts PAGE_TITLE from GKG EXTRAS field."""
    if not extras:
        return ""
    match = re.search(r"<PAGE_TITLE>(.*?)</PAGE_TITLE>", extras)
    if match:
        return match.group(1)
    return ""


def get_domain(url: str) -> str:
    """Extracts domain from URL."""
    if not url:
        return "unknown"
    match = re.search(r"https?://([^/]+)", url)
    if match:
        return match.group(1)
    return url


def map_gkg_to_cognitive_domain(
    record: List[str], config: Dict[str, Any] = None
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Maps a single GDELT GKG record to IntelGraph entities and relationships.

    Returns:
        (entities, relationships)
    """
    if len(record) <= GKG_EXTRAS:
        # Handle incomplete records
        return [], []

    record_id = record[GKG_RECORD_ID]
    date_str = record[GKG_DATE]
    url = record[GKG_DOCUMENT_IDENTIFIER]
    themes = record[GKG_THEMES].split(";") if record[GKG_THEMES] else []
    tone_str = record[GKG_TONE].split(",") if record[GKG_TONE] else []
    extras = record[GKG_EXTRAS]

    entities = []
    relationships = []

    # 1. Map to Channel
    domain = get_domain(url)
    channel_id = f"channel-{domain}"
    channel = {
        "id": channel_id,
        "type": "Channel",
        "properties": {
            "id": channel_id,
            "channel_type": "web",
            "name": domain,
            "url": url,
        },
    }
    entities.append(channel)

    # 2. Map to Narrative
    title = extract_page_title(extras)
    if not title and themes:
        title = f"Narrative around {themes[0].replace('_', ' ').title()}"
    elif not title:
        title = f"Narrative {record_id}"

    narrative_id = f"narrative-{record_id}"
    narrative = {
        "id": narrative_id,
        "type": "Narrative",
        "properties": {
            "id": narrative_id,
            "title": title,
            "topic": themes[0] if themes else "General",
            "themes": themes[:10],  # Limit themes
            "created_at_source": date_str,
        },
    }
    entities.append(narrative)

    # 3. Map Tone to LegitimacySignal
    if tone_str:
        try:
            sentiment = float(tone_str[0])
            signal_id = f"signal-{record_id}-tone"
            signal = {
                "id": signal_id,
                "type": "LegitimacySignal",
                "properties": {
                    "id": signal_id,
                    "signal_type": "tone",
                    "value": sentiment,
                    "observed_at_source": date_str,
                },
            }
            entities.append(signal)

            # Relationship: LegitimacySignal -> Narrative (SUPPORTS)
            relationships.append(
                {
                    "id": f"rel-{signal_id}-supports-{narrative_id}",
                    "type": "SUPPORTS",
                    "from": signal_id,
                    "to": narrative_id,
                    "properties": {"weight": abs(sentiment) / 100.0},
                }
            )
        except (ValueError, IndexError):
            pass

    # 4. Relationship: Channel -> Narrative (AMPLIFIES)
    relationships.append(
        {
            "id": f"rel-{channel_id}-amplifies-{narrative_id}",
            "type": "AMPLIFIES",
            "from": channel_id,
            "to": narrative_id,
            "properties": {"observed_at": date_str},
        }
    )

    return entities, relationships
