import logging
from datetime import datetime
from typing import Any, Dict, List

from summit_harness.redaction import redact_dict


class ObservabilityHook:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.trace = []

    def record_event(self, event_type: str, data: dict[str, Any]):
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "session_id": self.session_id,
            "event_type": event_type,
            "data": redact_dict(data)
        }
        self.trace.append(event)
        return event
