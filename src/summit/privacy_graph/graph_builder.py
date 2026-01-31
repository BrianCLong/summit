from __future__ import annotations

from typing import Dict, List, Set, Tuple

from .types import GraphEvent, GraphFrame

ALLOWED_FEATURE_KEYS = {"bytes", "packets", "duration_ms", "count"}

def build_graph(events: list[GraphEvent]) -> GraphFrame:
    nodes: set[str] = set()
    edges: list[tuple[str, str]] = []
    edge_features: list[dict[str, float]] = []

    for e in events:
        nodes.add(e.src)
        nodes.add(e.dst)

        # Enforce allowlist and ensure numeric
        safe_feats = {
            k: float(v)
            for k, v in e.features.items()
            if k in ALLOWED_FEATURE_KEYS
        }

        edges.append((e.src, e.dst))
        edge_features.append(safe_feats)

    return GraphFrame(
        nodes=sorted(nodes),
        edges=edges,
        edge_features=edge_features
    )
