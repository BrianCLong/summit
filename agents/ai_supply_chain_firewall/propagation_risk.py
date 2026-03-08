from typing import Any, Dict

# Mock velocity database tracking recommendation spikes
# Key: dependency name, Value: { "recent_recommendations": count, "trust_score": float }
MOCK_VELOCITY_DB = {
    "malicious-pkg-001": {"recent_recommendations": 150, "trust_score": 0.1},
    "new-safe-lib": {"recent_recommendations": 5, "trust_score": 0.6},
    "react": {"recent_recommendations": 1000, "trust_score": 1.0}
}

def calculate_propagation_risk(dependency: str) -> dict[str, Any]:
    """
    Scores recommendation velocity anomalies and cross-model consensus anomalies.
    """
    db_entry = MOCK_VELOCITY_DB.get(dependency, {"recent_recommendations": 1, "trust_score": 0.5})

    velocity = db_entry["recent_recommendations"]
    trust = db_entry["trust_score"]

    # Simple risk heuristic: high velocity but low trust indicates potential propagation risk
    # "New/low-trust + high recommendation velocity"
    risk_score = 0.0
    is_anomaly = False
    reasons = []

    if velocity > 50 and trust < 0.3:
        risk_score = 0.9
        is_anomaly = True
        reasons.append(f"High recommendation velocity ({velocity}) combined with low trust score ({trust}).")
    elif velocity > 20 and trust < 0.5:
        risk_score = 0.6
        is_anomaly = True
        reasons.append("Moderate recommendation velocity with questionable trust score.")
    else:
        risk_score = 0.1
        reasons.append("Normal recommendation velocity and trust levels.")

    return {
        "risk_score": risk_score,
        "is_velocity_anomaly": is_anomaly,
        "velocity": velocity,
        "trust_score": trust,
        "reasons": reasons
    }
