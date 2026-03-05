import json
from typing import Dict, Any, List

def calculate_void_score(topic: str, locale: str, authority_density: float) -> Dict[str, Any]:
    """Calculate data void risk based on topic, locale and authority density."""
    risk = 1.0 - min(authority_density, 1.0)
    return {
        "topic": topic,
        "locale": locale,
        "authority_density": authority_density,
        "risk_score": round(risk, 4)
    }

def write_void_artifacts(scores: List[Dict[str, Any]], path: str):
    """Write data void risk scores deterministically."""
    sorted_scores = sorted(scores, key=lambda x: (x["topic"], x["locale"]))
    with open(path, "w") as f:
        json.dump(sorted_scores, f, sort_keys=True, indent=2)
