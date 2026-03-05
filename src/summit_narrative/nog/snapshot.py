from __future__ import annotations

import hashlib
import json
from typing import Any, Dict

from .model import NarrativeOperatingGraph, normalize_edges, normalize_nodes


def canonical_payload(nog: NarrativeOperatingGraph) -> dict[str, Any]:
    return {
        "version": nog.version,
        "nodes": normalize_nodes(nog.nodes),
        "edges": normalize_edges(nog.edges),
    }


def canonical_json(nog: NarrativeOperatingGraph) -> str:
    payload = canonical_payload(nog)
    return json.dumps(payload, sort_keys=True, separators=(",", ":"))


def canonical_hash(nog: NarrativeOperatingGraph) -> str:
    blob = canonical_json(nog).encode("utf-8")
    return hashlib.sha256(blob).hexdigest()
