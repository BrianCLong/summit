from __future__ import annotations

import json
import uuid
from typing import Any, Dict, Iterable, Tuple

# Maps OpenLineage events (json lines) → PROV-JSON / PROV-JSONLD
# Entity   ← Dataset
# Activity ← Run
# Agent    ← Producer

def _key(ns: str, name: str) -> str:
    return f"{ns}:{name}"

def _activity_id(run_id: str) -> str:
    return f"run:{run_id}"

def to_prov(openlineage_events: Iterable[dict[str, Any]]) -> dict[str, Any]:
    entities, activities, agents = {}, {}, {}
    wasAssociatedWith, used, wasGeneratedBy = [], [], []

    for ev in openlineage_events:
        run = ev["run"]["runId"]
        job = ev["job"]
        producer = ev.get("producer") or "unknown"
        act_id = _activity_id(run)
        activities[act_id] = {"id": act_id, "type": "Activity", "label": job["name"]}

        agents[producer] = {"id": producer, "type": "Agent", "label": "producer"}
        wasAssociatedWith.append([act_id, producer])

        for ds in ev.get("inputs", []):
            eid = _key(ds["namespace"], ds["name"])
            entities[eid] = {"id": eid, "type": "Entity", "datasetType": ds.get("datasetType")}
            used.append([act_id, eid])

        for ds in ev.get("outputs", []):
            eid = _key(ds["namespace"], ds["name"])
            entities[eid] = {"id": eid, "type": "Entity", "datasetType": ds.get("datasetType")}
            wasGeneratedBy.append([eid, act_id])

    return {
        "entity": entities,
        "activity": activities,
        "agent": agents,
        "wasAssociatedWith": wasAssociatedWith,
        "used": used,
        "wasGeneratedBy": wasGeneratedBy,
    }

def to_prov_jsonld(prov_json: dict[str, Any]) -> dict[str, Any]:
    return {
        "@context": "https://www.w3.org/ns/prov.jsonld",
        **prov_json
    }
