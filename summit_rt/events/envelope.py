import hashlib
import json
from typing import Any

def stable_hash(data: Any) -> str:
    """Computes a stable SHA-256 hash of the input data."""
    # Ensure dictionaries are sorted by key to guarantee stability
    # Use default=str to handle non-serializable objects gracefully
    canonical_json = json.dumps(data, sort_keys=True, default=str)
    return hashlib.sha256(canonical_json.encode('utf-8')).hexdigest()
