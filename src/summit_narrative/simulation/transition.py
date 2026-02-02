from __future__ import annotations

import hashlib
import json
from typing import Any, Dict

from ..nog.model import NarrativeOperatingGraph


def canonical_intervention_json(intervention: Dict[str, Any]) -> str:
    return json.dumps(intervention, sort_keys=True, separators=(",", ":"))


def intervention_hash(intervention: Dict[str, Any]) -> str:
    payload = canonical_intervention_json(intervention).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def apply_intervention(
    nog: NarrativeOperatingGraph, intervention: Dict[str, Any]
) -> NarrativeOperatingGraph:
    suffix = intervention_hash(intervention)[:8]
    return NarrativeOperatingGraph(
        nodes=nog.nodes,
        edges=nog.edges,
        version=f"{nog.version}-cf-{suffix}",
    )
