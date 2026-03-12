"""Schema mapping for HTTP/CSV connector."""

from typing import Any


def map_data_to_intelgraph(raw_data: dict[str, Any]) -> tuple[list[dict], list[dict]]:
    """
    Map raw CSV row to IntelGraph entities and relationships.

    Args:
        raw_data: CSV row as dict (includes _deterministic_id)

    Returns:
        (entities, relationships)
    """
    entities = []
    relationships = []

    # Get deterministic ID
    record_id = raw_data.get("_deterministic_id")

    # Determine entity type
    entity_type = raw_data.get("entity_type", "ReferenceEntity")

    # Create entity
    entity = {
        "type": entity_type,
        "properties": {
            "id": record_id,
            "source_id": raw_data.get("id"),
            "name": raw_data.get("name") or raw_data.get("title"),
            "description": raw_data.get("description", ""),
            # Pass through other fields
            **{
                k: v
                for k, v in raw_data.items()
                if k not in ["entity_type", "id", "name", "title", "description", "_deterministic_id"]
            },
        },
    }

    entities.append(entity)

    return entities, relationships
