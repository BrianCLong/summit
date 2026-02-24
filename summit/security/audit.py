import json
import logging
import os
from typing import Any, Dict, Optional

class AuditLogger:
    def __init__(self, path: str = "artifacts/evidence/security/policy_audit.log.jsonl"):
        self.path = path
        # Ensure directory exists
        os.makedirs(os.path.dirname(path), exist_ok=True)

    def log_event(self, event_type: str, details: Dict[str, Any], decision: str, classification: str = "internal"):
        entry = {
            "event_type": event_type,
            "decision": decision,
            "classification": classification,
            "details": self._sanitize(details)
        }
        with open(self.path, "a") as f:
            f.write(json.dumps(entry) + "\n")

    def _sanitize(self, data: Dict[str, Any]) -> Dict[str, Any]:
        # Basic sanitization
        sanitized = data.copy()
        if "api_key" in sanitized:
            sanitized["api_key"] = "[REDACTED]"
        return sanitized
