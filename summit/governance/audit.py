from __future__ import annotations

import json
import os
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional


@dataclass(frozen=True)
class AuditEvent:
    event_type: str
    actor: str
    action: str
    decision: str  # "allow" | "deny" | "needs_approval"
    metadata: dict[str, Any]
    evidence_id: Optional[str] = None

NEVER_LOG = ["password", "secret", "token", "api_key", "pii", "phi"]

def redact(data: dict[str, Any]) -> dict[str, Any]:
    """Simple recursive redaction for sensitive fields."""
    redacted = {}
    for k, v in data.items():
        if any(term in k.lower() for term in NEVER_LOG):
            redacted[k] = "[REDACTED]"
        elif isinstance(v, dict):
            redacted[k] = redact(v)
        elif isinstance(v, list):
            redacted[k] = [redact(item) if isinstance(item, dict) else item for item in v]
        else:
            redacted[k] = v
    return redacted

def emit(event: AuditEvent, sink: str = "governance/audit/audit.jsonl") -> None:
    """
    Emits an audit event to a structured append-only sink.
    Redacts sensitive information before writing.
    """
    event_dict = asdict(event)
    event_dict["metadata"] = redact(event_dict["metadata"])

    # Ensure sink directory exists
    sink_path = Path(sink) if hasattr(sink, 'open') else Path(sink)
    sink_path.parent.mkdir(parents=True, exist_ok=True)

    with open(sink_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(event_dict) + "\n")
