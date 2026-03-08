import hashlib
import json
from typing import Any, Dict, List, Union


def hash_data(data: Union[str, bytes, dict, list]) -> str:
    """Computes SHA256 hash of data deterministically."""
    if isinstance(data, (dict, list)):
        # Serialize to JSON with sorted keys
        data = json.dumps(data, sort_keys=True, separators=(',', ':')).encode('utf-8')
    elif isinstance(data, str):
        data = data.encode('utf-8')
    elif isinstance(data, bytes):
        pass
    else:
        data = str(data).encode('utf-8')

    return hashlib.sha256(data).hexdigest()

def compute_merkle_root(hashes: list[str]) -> str:
    """Computes a Merkle root from a list of hashes."""
    if not hashes:
        return hash_data("")

    hashes = sorted(hashes)
    while len(hashes) > 1:
        next_level = []
        for i in range(0, len(hashes), 2):
            left = hashes[i]
            right = hashes[i+1] if i+1 < len(hashes) else left
            combined = left + right
            next_level.append(hashlib.sha256(combined.encode('utf-8')).hexdigest())
        hashes = next_level
    return hashes[0]
