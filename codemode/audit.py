import json
from datetime import datetime
from typing import Any, Dict, List

NEVER_LOG_FIELDS = {"api_key", "token", "password", "authorization", "secret", "cookie"}

def redact(data: Any) -> Any:
    if isinstance(data, dict):
        new_dict = {}
        for k, v in data.items():
            if k.lower() in NEVER_LOG_FIELDS:
                new_dict[k] = "[REDACTED]"
            else:
                new_dict[k] = redact(v)
        return new_dict
    elif isinstance(data, list):
        return [redact(i) for i in data]
    else:
        return data

class AuditLogger:
    def __init__(self):
        self.logs = []

    def log_event(self, event_type: str, tool_name: str, payload: Any, status: str = "info"):
        entry = {
            "timestamp": datetime.now().isoformat(),
            "event_type": event_type,
            "tool_name": tool_name,
            "payload": redact(payload),
            "status": status
        }
        self.logs.append(entry)
        # In real life, write to OTEL/Stdout
        # print(json.dumps(redact(entry)))
