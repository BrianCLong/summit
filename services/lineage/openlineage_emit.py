from __future__ import annotations

import json
import os
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone

PRODUCER_URI = "https://summit.example.com/lineage"
DIGEST_SCHEMA_URL = "https://openlineage.io/spec/facets/1-0-0/DatasetFacet"


@dataclass(frozen=True)
class OpenLineageEvent:
    payload: dict

    def to_bytes(self) -> bytes:
        return json.dumps(self.payload, separators=(",", ":"), sort_keys=True).encode(
            "utf-8"
        )


def build_run_event(
    namespace: str,
    job: str,
    run_id: str,
    run_digest: str,
    input_name: str,
    manifest_path: str,
) -> OpenLineageEvent:
    event_time = datetime.now(timezone.utc).isoformat()
    facets = {
        "digest": {
            "_producer": PRODUCER_URI,
            "_schemaURL": DIGEST_SCHEMA_URL,
            "sha256": run_digest,
        },
        "manifest": {
            "_producer": PRODUCER_URI,
            "_schemaURL": "https://summit.example.com/schemas/lineage/run-manifest",
            "path": manifest_path,
        },
    }

    payload = {
        "eventType": "COMPLETE",
        "eventTime": event_time,
        "producer": PRODUCER_URI,
        "run": {"runId": run_id, "facets": facets},
        "job": {"namespace": namespace, "name": job},
        "inputs": [
            {
                "namespace": namespace,
                "name": input_name,
                "facets": facets,
            }
        ],
    }
    return OpenLineageEvent(payload=payload)


def emit_event(event: OpenLineageEvent, endpoint: str) -> None:
    request = urllib.request.Request(
        endpoint,
        data=event.to_bytes(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        response.read()


def maybe_emit_openlineage(
    *,
    namespace: str,
    job: str,
    run_id: str,
    run_digest: str,
    input_name: str,
    manifest_path: str,
    stamp_path: str,
    emit_enabled: bool,
    require_emit: bool,
) -> None:
    if not emit_enabled and not require_emit:
        return

    endpoint = os.getenv("OPENLINEAGE_URL")
    if not endpoint:
        message = "OPENLINEAGE_URL is required when LINEAGE_EMIT is enabled."
        raise RuntimeError(message)

    event = build_run_event(
        namespace=namespace,
        job=job,
        run_id=run_id,
        run_digest=run_digest,
        input_name=input_name,
        manifest_path=manifest_path,
    )

    try:
        emit_event(event, endpoint)
    except Exception as exc:  # pragma: no cover - network failure path
        if require_emit:
            raise RuntimeError("OpenLineage emission failed.") from exc
        stamp_notice = {
            "note": "OpenLineage emission failed",
            "endpoint": endpoint,
        }
        with open(stamp_path, "r+", encoding="utf-8") as handle:
            stamp = json.load(handle)
            stamp["openlineage"] = stamp_notice
            handle.seek(0)
            json.dump(stamp, handle, indent=2)
            handle.truncate()
