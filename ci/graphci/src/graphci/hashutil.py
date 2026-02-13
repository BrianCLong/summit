import json
import hashlib
from typing import Any

def sha256_bytes(b: bytes) -> str:
    """Computes the SHA-256 hash of a byte string."""
    return hashlib.sha256(b).hexdigest()

def sha256_str(s: str) -> str:
    """Computes the SHA-256 hash of a string."""
    return sha256_bytes(s.encode("utf-8"))

def stable_json_dumps(obj: Any) -> str:
    """Returns a deterministic JSON string for an object."""
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
