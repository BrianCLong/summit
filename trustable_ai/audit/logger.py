from typing import Dict, Any
import datetime
import json
import os

FORBIDDEN_KEYS = {"password", "api_key", "secret", "token", "prompt", "user_pii"}

class AuditLogger:
    def log(self, event_type: str, payload: Dict[str, Any]):
        if os.environ.get("TRUST_AUDIT_ENABLED", "0") != "1":
            return

        cleaned_payload = self._clean(payload)
        event = {
            "event_type": event_type,
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "payload": cleaned_payload
        }
        # In real impl, write to secure storage. Here print or no-op.
        # print(json.dumps(event))

    def _clean(self, data: Dict[str, Any]) -> Dict[str, Any]:
        cleaned = {}
        for k, v in data.items():
            if k.lower() in FORBIDDEN_KEYS:
                raise ValueError(f"Forbidden key logged: {k}")
            cleaned[k] = v
        return cleaned
