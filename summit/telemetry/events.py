import time
from dataclasses import dataclass
from typing import Any, Dict, Optional


@dataclass
class TelemetryEvent:
    event_type: str
    timestamp: float
    payload: dict[str, Any]

    def __init__(self, event_type: str, payload: dict[str, Any]):
        self.event_type = event_type
        self.timestamp = time.time()
        self.payload = payload

# Allowlisted fields for interaction events
ALLOWED_INTERACTION_FIELDS = {
    "interaction_mode",  # e.g., "delegation", "engaged"
    "model_name",
    "task_id_hash",      # Anonymized task ID
    "latency_ms",
    "input_token_count",
    "output_token_count",
    "spm_enabled"        # Boolean
}

class InteractionEvent(TelemetryEvent):
    def __init__(self, mode: str, model: str, spm: bool, extra_metrics: Optional[dict[str, Any]] = None):
        payload = {
            "interaction_mode": mode,
            "model_name": model,
            "spm_enabled": spm
        }
        if extra_metrics:
            # Filter extra metrics to allowlist
            for k, v in extra_metrics.items():
                if k in ALLOWED_INTERACTION_FIELDS:
                    payload[k] = v

        super().__init__("interaction_event", payload)
