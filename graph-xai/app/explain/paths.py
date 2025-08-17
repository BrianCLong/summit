from __future__ import annotations

import networkx as nx


def top_paths(g: nx.Graph, src: str, dst: str, k: int = 3):
    paths = []
    try:
        for path in nx.all_simple_paths(g, src, dst, cutoff=4):
            score = 1 / len(path)
            rationale = f"bridge via {path[1]}" if len(path) > 2 else "direct connection"
            paths.append({"path": path, "score": score, "rationale": rationale})
    except nx.NetworkXNoPath:
        pass
    return sorted(paths, key=lambda x: x["score"], reverse=True)[:k]
