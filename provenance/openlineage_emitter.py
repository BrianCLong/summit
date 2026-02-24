import json
import os
import sys
import time
import uuid
import urllib.request
from pathlib import Path
from typing import Any

OL_ENDPOINT = os.getenv("OPENLINEAGE_ENDPOINT")
NAMESPACE = os.getenv("OPENLINEAGE_NAMESPACE", "summit-sync")
AUDIT_FILE = os.getenv("OPENLINEAGE_AUDIT_FILE", "artifacts/lineage/openlineage.jsonl")
JOB_NAME = os.getenv("OPENLINEAGE_JOB_NAME", "summit-sync")


def _persist_audit(payload: dict[str, Any]) -> None:
    path = Path(AUDIT_FILE)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(payload, sort_keys=True))
        handle.write("\n")


def _post(payload: dict[str, Any]) -> None:
    if not OL_ENDPOINT:
        return
    req = urllib.request.Request(
        OL_ENDPOINT.rstrip("/") + "/api/v1/lineage",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    urllib.request.urlopen(req, timeout=2).read()


def emit_event(
    event_type: str,
    facets: dict[str, Any],
    *,
    run_id: str | None = None,
    inputs: list[dict[str, Any]] | None = None,
    outputs: list[dict[str, Any]] | None = None,
) -> bool:
    payload: dict[str, Any] = {
        "eventTime": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "eventType": event_type,
        "producer": "summit-sync/0.1",
        "run": {"runId": run_id or str(uuid.uuid4())},
        "job": {"namespace": NAMESPACE, "name": JOB_NAME},
        "inputs": inputs or [],
        "outputs": outputs or [],
        "facets": facets,
    }
    try:
        _persist_audit(payload)
        _post(payload)
        print("OPENLINEAGE_EVENT_OK", event_type)
        print("summit_openlineage_success_total=1")
        return True
    except Exception as exc:
        print("OPENLINEAGE_EVENT_ERR", event_type, str(exc), file=sys.stderr)
        return False


def emit_mutation_event(
    *,
    source_system: str,
    db_name: str,
    table: str,
    op_type: str,
    txid: str,
    lsn: str,
    commit_ts: str,
    actor: str | None,
    checksum: str,
    output_name: str,
) -> bool:
    run_id = f"txid:{txid}/lsn:{lsn}"
    facets = {
        "tx": {
            "_producer": "summit-sync",
            "source_system": source_system,
            "db_name": db_name,
            "table": table,
            "txid": txid,
            "lsn": lsn,
            "commit_ts": commit_ts,
            "op_type": op_type,
            "actor": actor,
            "checksum": checksum,
        }
    }
    return emit_event(
        "COMPLETE",
        facets,
        run_id=run_id,
        inputs=[
            {
                "namespace": f"{source_system}/{db_name}",
                "name": table,
                "facets": {"tx": facets["tx"]},
            }
        ],
        outputs=[
            {
                "namespace": "neo4j://intelgraph",
                "name": output_name,
                "facets": {"checksum": {"value": checksum}},
            }
        ],
    )
