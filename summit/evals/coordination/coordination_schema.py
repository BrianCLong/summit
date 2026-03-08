from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Sequence


@dataclass(frozen=True)
class CoordinationEvent:
    evidence_id: str
    from_agent: str
    to_agent: str
    context_hash: str
    timestamp: int
    handoff_complete: bool = True
    conflict_resolved_ms: int = 0

    @classmethod
    def from_mapping(cls, payload: Mapping[str, Any]) -> CoordinationEvent:
        required = ("evidence_id", "from_agent", "to_agent", "context_hash", "timestamp")
        missing = [key for key in required if key not in payload or payload[key] in (None, "")]
        if missing:
            raise ValueError(f"Missing required coordination fields: {', '.join(missing)}")

        timestamp = payload["timestamp"]
        if not isinstance(timestamp, int) or timestamp < 0:
            raise ValueError("timestamp must be a non-negative deterministic logical clock")

        conflict_latency = int(payload.get("conflict_resolved_ms", 0))
        if conflict_latency < 0:
            raise ValueError("conflict_resolved_ms must be >= 0")

        return cls(
            evidence_id=str(payload["evidence_id"]),
            from_agent=str(payload["from_agent"]),
            to_agent=str(payload["to_agent"]),
            context_hash=str(payload["context_hash"]),
            timestamp=timestamp,
            handoff_complete=bool(payload.get("handoff_complete", True)),
            conflict_resolved_ms=conflict_latency,
        )


def validate_event_stream(events: Sequence[CoordinationEvent]) -> None:
    if not events:
        raise ValueError("coordination event stream cannot be empty")

    last_tick = -1
    for event in events:
        if not event.evidence_id:
            raise ValueError("missing evidence_id in coordination stream")
        if event.timestamp < last_tick:
            raise ValueError("coordination stream timestamps must be monotonic")
        last_tick = event.timestamp
