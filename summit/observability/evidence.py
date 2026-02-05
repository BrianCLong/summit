from __future__ import annotations
import hashlib
import json
from typing import Any, Dict

EVIDENCE_PREFIX = "SUMMIT-OBS"

def evidence_id(run_input: Dict[str, Any]) -> str:
    """Generates a deterministic evidence ID based on the input."""
    # Ensure consistent serialization for hashing
    # default=str handles non-serializable objects by converting to string, ensuring robustness
    blob = json.dumps(run_input, sort_keys=True, separators=(",", ":"), default=str).encode("utf-8")
    h = hashlib.sha256(blob).hexdigest()[:16]
    return f"{EVIDENCE_PREFIX}-{h}"
