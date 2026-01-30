from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Dict, Optional
import hashlib
import json
from datetime import datetime, timezone

SCHEMA_VERSION = "1"

def utc_now_rfc3339() -> str:
    return datetime.now(timezone.utc).isoformat()

def stable_hash(obj: Any) -> str:
    b = json.dumps(obj, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(b).hexdigest()

@dataclass(frozen=True)
class EventEnvelope:
    event_id: str
    source: Dict[str, Any]
    ingest_time: str
    event_time: Optional[str]
    entity_hint: Dict[str, Any]
    payload: Dict[str, Any]
    provenance: Dict[str, Any]
    idempotency_key: str
    schema_version: str = SCHEMA_VERSION

    @staticmethod
    def from_parts(*, source: Dict[str, Any], payload: Dict[str, Any],
                   entity_hint: Optional[Dict[str, Any]] = None,
                   provenance: Optional[Dict[str, Any]] = None,
                   event_time: Optional[str] = None) -> "EventEnvelope":
        entity_hint = entity_hint or {"type": "Unknown", "key": "unknown"}
        provenance = provenance or {"tenant": "default", "collector": "unknown"}

        # idempotency_key should be stable across retries; prefer upstream IDs if present.
        idem_basis = {
            "source": source,
            "entity_hint": entity_hint,
            "payload_fingerprint": stable_hash(payload.get("parsed", payload)),
        }
        idempotency_key = stable_hash(idem_basis)
        event_id = idempotency_key  # v1: deterministic; can be uuid later if desired

        return EventEnvelope(
            event_id=event_id,
            source=source,
            ingest_time=utc_now_rfc3339(),
            event_time=event_time,
            entity_hint=entity_hint,
            payload=payload,
            provenance=provenance,
            idempotency_key=idempotency_key,
        )
