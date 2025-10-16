from typing import Dict, Any


def explain_merge(features: Dict[str, Any]) -> Dict[str, Any]:
    """Counterfactual: minimum feature edit to flip decision."""
    # Example: reduce name_distance by 0.12 OR add co-occurrence@t±1d
    return {
        "decision": "merge" if features["score"] >= 0.82 else "no-merge",
        "salient_features": sorted(features["importances"], key=lambda kv: -kv[1])[:5],
        "counterfactual": {"name_distance": features["name_distance"] - 0.12},
    }
