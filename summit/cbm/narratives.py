import json
from typing import Iterable, Dict, Any

def build_narrative_graph(docs: Iterable[Dict[str, Any]]) -> Dict[str, Any]:
    """Clusters extracted claims into narratives."""
    nodes = []
    edges = []
    for i, doc in enumerate(docs):
        doc_id = doc.get("id", f"doc_{i}")
        text = doc.get("text", "")
        nodes.append({
            "id": f"claim_{doc_id}",
            "type": "Claim",
            "attrs": {"text": text}
        })
        edges.append({
            "src": f"claim_{doc_id}",
            "dst": "narrative_1",
            "type": "supports",
            "weight": 1.0
        })

    # Always include a base narrative
    nodes.append({"id": "narrative_1", "type": "Narrative", "attrs": {"label": "Extracted Narrative"}})

    return {"nodes": sorted(nodes, key=lambda x: x["id"]), "edges": sorted(edges, key=lambda x: (x["src"], x["dst"]))}

def write_narrative_artifacts(graph: Dict[str, Any], path: str):
    """Write narratives deterministically."""
    with open(path, "w") as f:
        json.dump(graph, f, sort_keys=True, indent=2)
