from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Iterable, List, Mapping, Tuple

from .foundations import MFT5, normalize

Node = str
Adj = Mapping[Node, Mapping[Node, float]]  # directed weights (cue -> response)

@dataclass(frozen=True)
class MagConfig:
    damping: float = 0.85      # analogous to MAG's b parameter (paper uses a damping term).
    max_iters: int = 200
    tol: float = 1e-10

def diffuse_moral_relevance(
    subgraph: Adj,
    moral_seed_nodes: Iterable[Node],
    *,
    cfg: MagConfig = MagConfig(),
) -> dict[Node, float]:
    """
    Clean-room diffusion inspired by MAG:
    - deterministic power-iteration on a row-normalized adjacency
    - restart/teleport biased to moral_seed_nodes
    Returns per-node moral relevance scores in [0,1] that sum to 1.
    """
    nodes = sorted(subgraph.keys())
    idx = {n: i for i, n in enumerate(nodes)}
    n = len(nodes)
    if n == 0:
        return {}

    seeds = [s for s in moral_seed_nodes if s in idx]
    if not seeds:
        # deny-by-default: no moral anchors
        return {node: 0.0 for node in nodes}

    # Teleport distribution (uniform over seeds)
    t = [0.0] * n
    for s in seeds:
        t[idx[s]] = 1.0
    z = sum(t) or 1.0
    t = [v / z for v in t]

    # Row-normalize adjacency deterministically
    rows: list[list[tuple[int, float]]] = [[] for _ in range(n)]
    for src in nodes:
        m = subgraph.get(src, {})
        total = sum(float(w) for _, w in m.items() if w and w > 0)
        if total <= 0:
            continue
        for dst, w in sorted(m.items()):
            if w and w > 0 and dst in idx:
                rows[idx[src]].append((idx[dst], float(w) / total))

    p = t[:]  # start at teleport
    for _ in range(cfg.max_iters):
        nxt = [(1.0 - cfg.damping) * t[i] for i in range(n)]
        for i in range(n):
            if not rows[i]:
                continue
            pi = p[i] * cfg.damping
            for j, w in rows[i]:
                nxt[j] += pi * w
        diff = sum(abs(nxt[i] - p[i]) for i in range(n))
        p = nxt
        if diff < cfg.tol:
            break

    out = {nodes[i]: p[i] for i in range(n)}
    # normalize numerically
    s = sum(out.values()) or 1.0
    return {k: v / s for k, v in out.items()}

def infer_foundation_vector(
    subgraph: Adj,
    foundation_seeds: Mapping[str, Iterable[Node]],
    *,
    cfg: MagConfig = MagConfig(),
) -> dict[str, float]:
    """
    Produce a foundation distribution by running diffusion per foundation seed-set
    and aggregating relevance mass (simple, interpretable baseline).
    """
    scores = {}
    for f in MFT5:
        rel = diffuse_moral_relevance(subgraph, foundation_seeds.get(f, []), cfg=cfg)
        scores[f] = sum(rel.values())
    return normalize(scores)
