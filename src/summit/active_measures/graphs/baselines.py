from __future__ import annotations

from collections import defaultdict
from typing import DefaultDict, Dict

from .model import Graph, NodeId


def out_weight(g: Graph) -> dict[NodeId, float]:
    s: DefaultDict[NodeId, float] = defaultdict(float)
    for (src, _dst, _k), w in g.edges.items():
        s[src] += w
    return dict(s)
