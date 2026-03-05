import re
import uuid


def extract_entities(text, segments):
    # Minimal deterministic entity extraction (Capitalized words > 3 chars)
    entities = []
    for seg in segments:
        for match in re.finditer(r'\b[A-Z][a-z]{3,}\b', seg['text']):
            ent_start = seg['start'] + match.start()
            ent_end = seg['start'] + match.end()
            ent_text = match.group(0)
            entities.append({
                "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, f"ent-{ent_start}-{ent_end}-{ent_text}")),
                "type": "Entity",
                "text": ent_text,
                "start": ent_start,
                "end": ent_end,
                "segment_id": seg['id']
            })
    return entities
