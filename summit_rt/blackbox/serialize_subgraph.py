from __future__ import annotations
from typing import Dict, List, Tuple

def serialize(nodes: List[Dict], edges: List[Dict], *, max_chars: int) -> str:
    # Deterministic ordering: type then id
    nodes_sorted = sorted(nodes, key=lambda n: (n.get("type",""), n.get("id","")))
    edges_sorted = sorted(edges, key=lambda e: (e.get("src",""), e.get("rel",""), e.get("dst","")))
    lines: List[str] = ["NODES:"]
    for n in nodes_sorted:
        lines.append(f"{n['id']} | {n.get('type','?')} | {n.get('props',{})} | prov={n.get('prov','?')}")
    lines.append("EDGES:")
    for e in edges_sorted:
        lines.append(f"{e['src']} -[{e['rel']}]-> {e['dst']} | ev={e.get('evidence','?')}")
    out = "\n".join(lines)
    return out[:max_chars]
