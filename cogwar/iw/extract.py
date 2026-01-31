import uuid
from typing import Any, Dict, List


def extract_indicators(observations: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Extracts indicators from a list of observations.
    Currently uses simple rule-based stubs.
    """
    indicators = []

    for obs in observations:
        content = obs.get("content", "").lower()
        source = obs.get("source", "unknown")

        # Rule 1: Narrative anomalies (keyword based stub)
        if "sync_attack" in content:
             indicators.append({
                 "id": f"IND-{uuid.uuid4().hex[:8]}",
                 "name": "Potential Synchronized Attack Narrative",
                 "description": f"Detected 'sync_attack' keyword in {source}",
                 "modality": "info",
                 "severity": "medium",
                 "confidence": 0.6,
                 "evidence_refs": [obs.get("id", "unknown_ref")]
             })

        # Rule 2: Behavioral anomaly (cadence stub)
        if obs.get("cadence_burst", False):
            indicators.append({
                 "id": f"IND-{uuid.uuid4().hex[:8]}",
                 "name": "Burst Amplification Anomaly",
                 "description": f"High frequency burst detected from {source}",
                 "modality": "behavioral",
                 "severity": "high",
                 "confidence": 0.8,
                 "evidence_refs": [obs.get("id", "unknown_ref")]
            })

    return indicators
