from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Any, Mapping


@dataclass(frozen=True)
class LedgerEntry:
    evidence_id: str
    context_hash: str


def make_context_hash(context: Mapping[str, Any]) -> str:
    canonical = json.dumps(context, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def create_entry(evidence_id: str, context: Mapping[str, Any]) -> LedgerEntry:
    if not evidence_id:
        raise ValueError("evidence_id is required")
    return LedgerEntry(evidence_id=evidence_id, context_hash=make_context_hash(context))
