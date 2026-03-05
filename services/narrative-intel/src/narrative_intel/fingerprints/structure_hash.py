import hashlib
import json
from typing import Any, Dict


def compute_structure_fingerprint(frame: dict[str, Any], lang: str) -> str:
    """
    Computes a deterministic hash of the narrative structure.
    """
    payload = {
        "frame": frame,
        "lang": lang
    }
    return hashlib.sha256(
        json.dumps(payload, sort_keys=True).encode()
    ).hexdigest()
