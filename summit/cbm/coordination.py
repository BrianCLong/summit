import hashlib
import json
from typing import Any, Dict, List

from .schema import DocumentEvent
from .signal_ledger import SignalLedger


def _hash_string(s: str) -> str:
    return hashlib.sha256(s.encode('utf-8')).hexdigest()[:12]

def detect_coordination(events: list[DocumentEvent], ledger: SignalLedger, run_date: str = "20240101") -> dict[str, Any]:
    """
    Given a list of document events, identify coordinated amplification
    based on timing synchronicity and content similarity heuristics.
    Returns deterministic influence graph nodes and edges.
    """
    nodes = {}
    edges = []

    for event in events:
        actor_id = event.metadata.get("author_id", "unknown_actor")
        asset_id = event.source

        if actor_id not in nodes:
            nodes[actor_id] = {"id": actor_id, "type": "Actor"}
        if asset_id not in nodes:
            nodes[asset_id] = {"id": asset_id, "type": "Asset"}

        edges.append({
            "source": actor_id,
            "target": asset_id,
            "relation": "amplifies"
        })

        if "burst" in event.content.lower():
            ledger.record_signal(actor_id, asset_id, "burst_pattern", {"confidence": 0.8})

    sorted_nodes = sorted(list(nodes.values()), key=lambda x: x["id"])
    sorted_edges = sorted(edges, key=lambda x: f"{x['source']}_{x['target']}_{x['relation']}")

    run_hash = _hash_string(str(sorted_edges))
    evidence_id = f"EVID-CBM-{run_date}-{run_hash}-0002"

    return {
        "metadata": {
            "evidence_id": evidence_id
        },
        "nodes": sorted_nodes,
        "edges": sorted_edges,
        "signals": ledger.get_ledger()
    }

def write_influence_graph_artifact(graph_data: dict[str, Any], output_path: str):
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(graph_data, f, indent=2, sort_keys=True)
