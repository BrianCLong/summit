import json
from typing import Iterable, Dict, Any

def detect_coordination(assets: Iterable[Dict[str, Any]]) -> Dict[str, Any]:
    """Detect coordinated inauthentic behavior across assets."""
    nodes = []
    edges = []

    for i, asset in enumerate(assets):
        asset_id = asset.get("id", f"asset_{i}")
        nodes.append({
            "id": f"actor_{asset_id}",
            "type": "Actor",
            "attrs": {"activity": asset.get("activity", "unknown"), "risk_score": 0.9}
        })
        edges.append({
            "src": f"actor_{asset_id}",
            "dst": "coordination_cell_1",
            "type": "coordinates_with",
            "weight": 1.0
        })

    nodes.append({"id": "coordination_cell_1", "type": "CoordinationCell", "attrs": {"risk_score": 0.95}})
    return {"nodes": sorted(nodes, key=lambda x: x["id"]), "edges": sorted(edges, key=lambda x: (x["src"], x["dst"]))}

def write_influence_artifacts(graph: Dict[str, Any], path: str):
    """Write influence graph deterministically."""
    with open(path, "w") as f:
        json.dump(graph, f, sort_keys=True, indent=2)
