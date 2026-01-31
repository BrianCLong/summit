from dataclasses import dataclass
from typing import Dict, List, Tuple


@dataclass(frozen=True)
class GraphEvent:
    src: str  # anonymized id
    dst: str  # anonymized id
    ts_bucket: int  # e.g., minute bucket
    features: dict[str, float]  # strictly numeric, allowlist enforced upstream

@dataclass(frozen=True)
class GraphFrame:
    nodes: list[str]
    edges: list[tuple[str, str]]
    edge_features: list[dict[str, float]]
