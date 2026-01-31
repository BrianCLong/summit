import json
from pathlib import Path
from typing import Any, Dict


class MemoryLedger:
    def __init__(self, path: Path):
        self.path = path

    def append(self, event: dict[str, Any]):
        # Redaction hook (simplified)
        safe_event = self._redact(event)
        with self.path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(safe_event) + "\n")

    def _redact(self, event: dict[str, Any]) -> dict[str, Any]:
        # Shallow redaction for now
        safe = event.copy()
        if "secret" in safe:
            safe["secret"] = "***"
        if "api_key" in safe:
            safe["api_key"] = "***"
        return safe
