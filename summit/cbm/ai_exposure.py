import hashlib
import json
from typing import Any, Dict, List


def _hash_string(s: str) -> str:
    return hashlib.sha256(s.encode('utf-8')).hexdigest()[:12]

def map_ai_exposure(prompts: list[str], responses: list[dict[str, Any]], run_date: str = "20240101") -> dict[str, Any]:
    """
    Map AI exposure by analyzing LLM responses to prompts.
    Detects if model outputs repeat specific narratives (laundering).
    Returns deterministic AI exposure graph.
    """
    nodes = []
    edges = []

    for idx, prompt in enumerate(prompts):
        prompt_node = {"id": f"prompt_{idx}", "type": "Prompt", "text": prompt}
        nodes.append(prompt_node)

        for res in responses:
            if prompt in res.get("prompt", ""):
                res_node = {"id": res.get("id", f"res_{idx}"), "type": "LLMResponse"}
                nodes.append(res_node)

                edges.append({
                    "source": prompt_node["id"],
                    "target": res_node["id"],
                    "relation": "generated"
                })

                if "narrative_overlap" in res.get("text", ""):
                    nodes.append({"id": "narrative_laundering", "type": "NarrativeOverlap"})
                    edges.append({
                        "source": res_node["id"],
                        "target": "narrative_laundering",
                        "relation": "repeats"
                    })

    sorted_nodes = sorted(nodes, key=lambda x: x["id"])
    sorted_edges = sorted(edges, key=lambda x: f"{x['source']}_{x['target']}_{x['relation']}")

    run_hash = _hash_string(str(sorted_edges))
    evidence_id = f"EVID-CBM-{run_date}-{run_hash}-0004"

    return {
        "metadata": {
            "evidence_id": evidence_id
        },
        "nodes": sorted_nodes,
        "edges": sorted_edges
    }

def write_ai_exposure_artifact(exposure_data: dict[str, Any], output_path: str):
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(exposure_data, f, indent=2, sort_keys=True)
