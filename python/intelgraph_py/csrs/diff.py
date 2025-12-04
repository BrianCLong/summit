"""Utilities for producing deterministic retention plan diffs."""
from __future__ import annotations

import difflib
import hmac
import hashlib
import json
from typing import Any, Mapping

_CANONICAL_SEPARATORS = (",", ":")


def _canonical_json(payload: Mapping[str, Any]) -> str:
    return json.dumps(
        payload,
        sort_keys=True,
        separators=_CANONICAL_SEPARATORS,
        ensure_ascii=False,
    )


def generate_signed_retention_diff(
    previous_plan: Mapping[str, Any] | None,
    proposed_plan: Mapping[str, Any],
    signing_key: str,
) -> Mapping[str, str]:
    """Return a deterministic diff and signature for a plan update."""

    previous_serialized = _canonical_json(previous_plan or {})
    proposed_serialized = _canonical_json(proposed_plan)
    diff = "\n".join(
        difflib.unified_diff(
            previous_serialized.splitlines(),
            proposed_serialized.splitlines(),
            fromfile="previous",
            tofile="proposed",
            lineterm="",
        )
    )
    digest = hmac.new(signing_key.encode("utf-8"), diff.encode("utf-8"), hashlib.sha256)
    return {
        "diff": diff,
        "signature": digest.hexdigest(),
        "algorithm": "hmac-sha256",
    }


__all__ = ["generate_signed_retention_diff"]
