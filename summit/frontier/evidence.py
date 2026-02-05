from dataclasses import dataclass
import json
import os
from typing import Any, Dict

EVIDENCE_ID_PREFIX = "SUMMIT-FRONTIER"

def evidence_id(kind: str, seq: int) -> str:
    """Generates a deterministic evidence ID."""
    return f"{EVIDENCE_ID_PREFIX}:{kind}:{seq:04d}"

def write_json(path: str, obj: Dict[str, Any]) -> None:
    """Writes JSON to a file with deterministic formatting."""
    # Ensure directory exists
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2, sort_keys=True)
