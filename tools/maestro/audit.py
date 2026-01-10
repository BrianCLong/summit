from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any, Dict


class AuditLogger:
    def __init__(self, path: Path, actor: str = "mc-cli"):
        self.path = path
        self.actor = actor
        path.parent.mkdir(parents=True, exist_ok=True)

    def emit(self, job_id: str, trace_id: str, event: str, detail: str = "") -> None:
        record: Dict[str, Any] = {
            "timestamp": time.time(),
            "actor": self.actor,
            "job_id": job_id,
            "trace_id": trace_id,
            "event": event,
            "detail": detail,
        }
        with self.path.open("a") as handle:
            handle.write(json.dumps(record) + "\n")
