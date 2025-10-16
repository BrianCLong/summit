# services/er/er_pipeline.py
import uuid


def resolve_entities(claims_by_type: dict[str, list[dict]], threshold=0.9):
    # claims_by_type: { 'package': [claim,...], 'cve':[claim,...] }
    entities = []
    links = []
    for typ, claims in claims_by_type.items():
        # naive blocking: same key only
        if not claims:
            continue
        # single‑link: choose the highest‑confidence claim as seed
        seed = max(claims, key=lambda c: c.get("conf", 0.5))
        ent_id = str(uuid.uuid4())
        entities.append({"id": ent_id, "type": typ, "canonical_name": seed["value"]})
        for c in claims:
            links.append(
                {
                    "entity_id": ent_id,
                    "manifest_id": c["manifestId"],
                    "key": c["key"],
                    "value": c["value"],
                    "conf": c.get("conf", 0.5),
                }
            )
    return entities, links
