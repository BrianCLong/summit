# predictive_threat_suite/counterfactual_simulator.py

from typing import Any


def simulate_counterfactual(
    scenario: dict[str, Any], intervention: dict[str, Any]
) -> dict[str, Any]:
    """
    Simulates counterfactual scenarios based on simple rules.
    """
    print(f"Simulating counterfactual for scenario {scenario} with intervention {intervention}")

    outcome = "unknown"
    impact = "neutral"

    threat_level = scenario.get("threat_level")
    action = intervention.get("action")

    if threat_level == "high" and action == "deploy_patch":
        outcome = "threat_mitigated"
        impact = "positive"
    elif threat_level == "medium" and action == "monitor":
        outcome = "threat_contained"
        impact = "neutral"
    elif threat_level == "high" and action == "do_nothing":
        outcome = "threat_escalated"
        impact = "negative"

    return {"outcome": outcome, "impact": impact}


def enable_counterfactual_simulator_feature(enable: bool) -> bool:
    """
    Stub for enabling/disabling the counterfactual simulator feature via a feature flag.
    """
    print(f"Setting counterfactual simulator feature flag to {enable}")
    return enable
