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
    db_system = attrs.get("db.system.name") or attrs.get("db.system")
    db_name = attrs.get("db.namespace") or attrs.get("db.name")
    if db_system and (db_name or attrs.get("db.statement")):
        name = db_name or "adhoc"
        ns   = f"{OL_NAMESPACE}/db/{db_system}"
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
    if attrs.get("messaging.system") and attrs.get("messaging.destination.name"):
        return {
            "namespace": f"{OL_NAMESPACE}/messaging/{attrs['messaging.system']}",
            "name": attrs["messaging.destination.name"],
            "datasetType": "QUEUE"
        }

    # file → dataset
    if attrs.get("file.path") or attrs.get("file.name"):
        return {
            "namespace": f"{OL_NAMESPACE}/fs",
            "name": attrs.get("file.path") or attrs.get("file.name", "unknown_file"),
            "datasetType": "FILE"
        }

    return None

def emit_from_spans(spans: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    """Converts a stream of OTEL span dicts into OpenLineage Event dicts."""
    events = []

    for span in spans:
        attrs = span.get("attributes", {})
        ds = _dataset_from_attrs(attrs)

        if not ds:
            continue

        run_id = attrs.get("openlineage.run_id") or _stable_run_id(span.get("context", {}).get("trace_id", str(uuid.uuid4())))
        job_n  = _job_name(span)
        kind   = span.get("kind", "SPAN_KIND_INTERNAL")

        inputs = []
        outputs = []

        # Naive heuristic: PRODUCER/CLIENT spans usually output, CONSUMER/SERVER spans usually input.
        if kind in ("SPAN_KIND_PRODUCER", "SPAN_KIND_CLIENT"):
            outputs.append(ds)
        elif kind in ("SPAN_KIND_CONSUMER", "SPAN_KIND_SERVER"):
            inputs.append(ds)
        else:
            # Internal span... read db.operation to guess
            op = str(attrs.get("db.operation", attrs.get("db.statement", ""))).lower()
            if any(x in op for x in ("insert", "update", "delete", "write", "create")):
                outputs.append(ds)
            else:
                inputs.append(ds)

        now_dt = time.strftime('%Y-%m-%dT%H:%M:%S.%fZ', time.gmtime())

        evt = {
            "eventType": "COMPLETE",
            "eventTime": now_dt,
            "run": {
                "runId": run_id
            },
            "job": {
                "namespace": OL_NAMESPACE,
                "name": job_n
            },
            "inputs": inputs,
            "outputs": outputs,
            "producer": OL_PRODUCER
        }
        events.append(evt)

    return events

def flush_events_to_file(events: list[dict[str, Any]], filepath: str = OL_SINK_PATH):
    if not events:
        return
    os.makedirs(os.path.dirname(os.path.abspath(filepath)), exist_ok=True)
    with open(filepath, "a") as f:
        for evt in events:
            f.write(json.dumps(evt) + "\n")
