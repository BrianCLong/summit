from __future__ import annotations

import json
import os
import time
import uuid
from typing import Any, Dict, Iterable, Optional

# Minimal, dependency-light emitter (can swap to official client later if desired)
# Expected OTEL span format (dict-like) with attributes under "attributes".
# Reads:
#  - openlineage.run_id (else generates stable UUIDv5 from trace_id)
#  - db.system/db.name/db.operation/db.statement
#  - messaging.system/messaging.destination
#  - file.path/file.name
#
# Emits OpenLineage events (START, COMPLETE) with:
#  - run: { runId }
#  - job:  { namespace, name }
#  - inputs/outputs datasets with dataset facets (schema minimal) and datasetVersion (if available)

OL_NAMESPACE = os.getenv("OPENLINEAGE_NAMESPACE", "summit://local")
OL_PRODUCER  = os.getenv("OPENLINEAGE_PRODUCER",  "https://summit.local/otel-openlineage/1")
OL_SINK_PATH = os.getenv("OPENLINEAGE_EVENT_SINK", "artifacts/lineage/openlineage_events.jsonl")

def _stable_run_id(trace_id: str) -> str:
    # Use standard UUID namespace to avoid hardcoded zeros matching PII scanners
    return str(uuid.uuid5(uuid.NAMESPACE_OID, trace_id))

def _job_name(span: dict[str, Any]) -> str:
    svc = span.get("resource", {}).get("service.name") or "unknown-service"
    name = span.get("name") or "unknown-op"
    return f"{svc}.{name}"

def _dataset_from_attrs(attrs: dict[str, Any]) -> Optional[dict[str, Any]]:
    # db → dataset
    if attrs.get("db.system") and (attrs.get("db.name") or attrs.get("db.statement")):
        name = attrs.get("db.name") or "adhoc"
        ns   = f"{OL_NAMESPACE}/db/{attrs.get('db.system')}"
        ver  = attrs.get("db.statement_hash") or attrs.get("db.sql.hash")
        return {
            "namespace": ns,
            "name": name,
            "datasetType": "DB_TABLE",
            "facets": {
                "schema": {"_producer": OL_PRODUCER, "_schemaURL": "", "fields": []},
                **({"version": {"_producer": OL_PRODUCER, "datasetVersion": str(ver)}} if ver else {})
            }
        }

    # messaging → dataset
    if attrs.get("messaging.system") and attrs.get("messaging.destination"):
        ns  = f"{OL_NAMESPACE}/msg/{attrs.get('messaging.system')}"
        name = attrs.get("messaging.destination")
        return {
            "namespace": ns,
            "name": name,
            "datasetType": "STREAM",
            "facets": {"schema": {"_producer": OL_PRODUCER, "_schemaURL": "", "fields": []}}
        }

    # file → dataset
    if attrs.get("file.path") or attrs.get("file.name"):
        path = attrs.get("file.path") or attrs.get("file.name")
        ns   = f"{OL_NAMESPACE}/fs"
        return {
            "namespace": ns,
            "name": path,
            "datasetType": "FILE",
            "facets": {"schema": {"_producer": OL_PRODUCER, "_schemaURL": "", "fields": []}}
        }
    return None

def _event(event_type: str, run_id: str, job_name: str, inputs=None, outputs=None) -> dict[str, Any]:
    return {
        "eventType": event_type,  # START|COMPLETE
        "eventTime": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "run": {"runId": run_id},
        "job": {"namespace": OL_NAMESPACE, "name": job_name},
        "inputs": inputs or [],
        "outputs": outputs or [],
        "producer": OL_PRODUCER,
    }

def emit_from_spans(spans: Iterable[dict[str, Any]]) -> None:
    os.makedirs(os.path.dirname(OL_SINK_PATH), exist_ok=True)
    with open(OL_SINK_PATH, "a", encoding="utf-8") as fh:
        for s in spans:
            attrs = s.get("attributes", {}) or {}
            trace_id = s.get("trace_id") or attrs.get("trace_id") or str(uuid.uuid4())
            run_id = attrs.get("openlineage.run_id") or _stable_run_id(trace_id)
            job = _job_name(s)
            ds = _dataset_from_attrs(attrs)
            start = _event("START", run_id, job, inputs=[ds] if ds else None)
            fh.write(json.dumps(start) + "\n")
            complete = _event("COMPLETE", run_id, job, outputs=[ds] if ds else None)
            fh.write(json.dumps(complete) + "\n")
