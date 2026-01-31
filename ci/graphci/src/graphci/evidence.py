from __future__ import annotations
import json
import os
from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional
from .hashutil import sha256_bytes, stable_json_dumps

@dataclass(frozen=True)
class EvidenceStamp:
    evidence_id: str
    created_utc: str
    input_tree_sha256: str
    tool_version: str
    git_sha: str

class EvidenceWriter:
    def __init__(self, base_dir: str, evidence_id: str):
        self.base_dir = os.path.join(base_dir, evidence_id)
        os.makedirs(self.base_dir, exist_ok=True)
        self.evidence_id = evidence_id

    def write_json(self, relpath: str, obj: Any) -> str:
        """Writes an object to a JSON file and returns its hash."""
        path = os.path.join(self.base_dir, relpath)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        data = stable_json_dumps(obj).encode("utf-8")
        with open(path, "wb") as f:
            f.write(data)
        return sha256_bytes(data)

    def write_bytes(self, relpath: str, data: bytes) -> str:
        """Writes raw bytes to a file and returns its hash."""
        path = os.path.join(self.base_dir, relpath)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as f:
            f.write(data)
        return sha256_bytes(data)

    def write_stamp(self, stamp: EvidenceStamp) -> str:
        """Writes the evidence stamp file."""
        return self.write_json("stamp.json", asdict(stamp))

    def write_metrics(self, metrics: Dict[str, Any]) -> str:
        """Writes the evidence metrics file."""
        return self.write_json("metrics.json", metrics)
