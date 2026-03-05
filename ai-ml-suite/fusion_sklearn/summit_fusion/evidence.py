import hashlib
import json
from dataclasses import dataclass


def sha256_bytes(b: bytes) -> str:
    """Compute SHA-256 hash of bytes."""
    return hashlib.sha256(b).hexdigest()

def stable_json_dumps(obj) -> str:
    """
    Produce canonical JSON string for hashing.
    Sorts keys to ensure deterministic output.
    """
    return json.dumps(obj, sort_keys=True, separators=(',', ':'))

@dataclass(frozen=True)
class EvidenceId:
    namespace: str
    digest: str

    def __str__(self) -> str:
        return f"EV:{self.namespace}:{self.digest[:16]}"
