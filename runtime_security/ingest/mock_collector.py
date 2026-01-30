from __future__ import annotations

from .redaction import redact
from .schemas import RuntimeSignal


def collect() -> list[RuntimeSignal]:
    raw = [
        RuntimeSignal(
            ts="2026-01-01T00:00:00Z",
            source="mock",
            workload_id="wl-1",
            event_type="process_start",
            attrs=redact({"cmd": "python app.py", "token": "SHOULD_NOT_LEAK"})
        )
    ]
    return raw
