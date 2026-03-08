import hashlib
import json
import os
from typing import Any, Dict, List, Set

REGISTRY_PATH = "evidence/slopguard/registry/seen_artifacts.json"

def get_tokens(text: str) -> set[str]:
    """Simple shingling/tokenization for similarity."""
    return set(text.lower().split())

def calculate_jaccard(set1: set[str], set2: set[str]) -> float:
    """Calculates Jaccard similarity between two sets."""
    if not set1 or not set2:
        return 0.0
    intersection = set1.intersection(set2)
    union = set1.union(set2)
    return len(intersection) / len(union)

def run_cluster_analysis(artifact: dict[str, Any], policy: dict[str, Any]) -> dict[str, Any]:
    """
    Detects if the artifact is too similar to previously seen artifacts.
    """
    flags = policy.get("feature_flags", {})
    if not flags.get("advanced_cluster_detection", False):
        return {"status": "DISABLED", "findings": []}

    text = artifact.get("text", "")
    if not text:
        return {"status": "ACTIVE", "findings": []}

    tokens = get_tokens(text)
    artifact_hash = hashlib.sha256(text.encode()).hexdigest()

    # Load registry
    os.makedirs(os.path.dirname(REGISTRY_PATH), exist_ok=True)
    registry = []
    if os.path.exists(REGISTRY_PATH):
        try:
            with open(REGISTRY_PATH) as f:
                registry = json.load(f)
        except:
            registry = []

    findings = []
    for entry in registry:
        if entry["hash"] == artifact_hash:
            findings.append({
                "type": "EXACT_DUPLICATE",
                "similarity": 1.0,
                "artifact_id": entry.get("id", "unknown")
            })
            continue

        entry_tokens = set(entry["tokens"])
        similarity = calculate_jaccard(tokens, entry_tokens)

        if similarity > 0.8: # High similarity threshold
            findings.append({
                "type": "NEAR_DUPLICATE",
                "similarity": round(similarity, 4),
                "artifact_id": entry.get("id", "unknown")
            })

    # Update registry (limit to last 100 for sandbox)
    new_entry = {
        "id": artifact.get("id", "new-artifact"),
        "hash": artifact_hash,
        "tokens": list(tokens)
    }
    registry.append(new_entry)
    registry = registry[-100:]

    with open(REGISTRY_PATH, "w") as f:
        json.dump(registry, f, sort_keys=True)

    return {
        "status": "ACTIVE",
        "findings": findings,
        "message": f"Compared against {len(registry)-1} previous artifacts"
    }
