from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Any, Mapping


def _stable_hash(obj: Any, n: int) -> str:
    b = json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("utf-8")
    return hashlib.sha256(b).hexdigest()[:n]

@dataclass(frozen=True)
class EvidenceId:
    pipeline: str
    git_sha8: str
    inputs12: str
    params8: str

    def __str__(self) -> str:
        return f"eid.summit.{self.pipeline}.{self.git_sha8}.{self.inputs12}.{self.params8}"

def compute_eid(pipeline: str, git_sha: str, inputs_manifest: Mapping[str, Any], params: Mapping[str, Any]) -> EvidenceId:
    if not pipeline or "." in pipeline:
        raise ValueError("pipeline must be non-empty and must not contain '.'")
    git_sha8 = (git_sha or "")[:8]
    if len(git_sha8) < 8:
        raise ValueError("git_sha must be at least 8 chars")
    return EvidenceId(
        pipeline=pipeline,
        git_sha8=git_sha8,
        inputs12=_stable_hash(inputs_manifest, 12),
        params8=_stable_hash(params, 8),
    )
