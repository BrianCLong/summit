"""
Deterministic evidence ID generation for the Summit data plane.

An evidence ID encodes:
  - which pipeline produced the artifact
  - which git commit was running
  - a stable hash of the input manifest (what events were consumed)
  - a stable hash of the pipeline parameters

Format:
    eid.dp.<pipeline>.<git_sha8>.<inputs12>.<params8>

This mirrors the convention in libs/evidence/eid.py so evidence IDs
produced by the data plane are compatible with the rest of Summit.
"""
from __future__ import annotations

import hashlib
import json
import os
from typing import Any


def _sha256_prefix(data: Any, length: int) -> str:
    serialised = json.dumps(data, sort_keys=True, default=str)
    return hashlib.sha256(serialised.encode()).hexdigest()[:length]


def generate_evidence_id(
    pipeline: str,
    inputs: Any,
    params: Any,
    git_sha: str | None = None,
) -> str:
    """
    Return a deterministic evidence ID.

    ``pipeline``  – logical pipeline name, e.g. "github.repo_intel"
    ``inputs``    – anything that uniquely identifies the input set
                    (e.g. list of event IDs or a content hash manifest)
    ``params``    – pipeline configuration dict
    ``git_sha``   – optional override; defaults to GIT_COMMIT env var or "00000000"
    """
    sha = (git_sha or os.getenv("GIT_COMMIT", ""))[:8].ljust(8, "0")
    inputs_token = _sha256_prefix(inputs, 12)
    params_token = _sha256_prefix(params, 8)
    return f"eid.dp.{pipeline}.{sha}.{inputs_token}.{params_token}"


def evidence_id_for_run(
    pipeline: str,
    event_ids: list[str],
    run_config: dict[str, Any],
    git_sha: str | None = None,
) -> str:
    """Convenience wrapper that takes a list of event IDs as the input manifest."""
    return generate_evidence_id(
        pipeline=pipeline,
        inputs=sorted(event_ids),
        params=run_config,
        git_sha=git_sha,
    )
