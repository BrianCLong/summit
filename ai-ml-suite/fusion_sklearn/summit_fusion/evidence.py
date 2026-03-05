import hashlib
import json
from dataclasses import dataclass
from typing import Any


def sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()

def stable_json_dumps(obj: Any) -> str:
    """Returns canonical JSON: sorted keys, compact separators."""
    return json.dumps(obj, sort_keys=True, separators=(",", ":"))

@dataclass(frozen=True)
class EvidenceId:
    namespace: str
    digest: str

    def __str__(self) -> str:
        return f"EV:{self.namespace}:{self.digest[:16]}"

    @classmethod
    def from_dict(cls, namespace: str, data: dict) -> "EvidenceId":
        json_str = stable_json_dumps(data)
        digest = sha256_bytes(json_str.encode("utf-8"))
        return cls(namespace=namespace, digest=digest)
