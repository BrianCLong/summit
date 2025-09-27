
# predictive_threat_suite/causal_explainer.py

from typing import Dict, Any, List

def get_causal_explanation(event: Dict[str, Any], context: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Provides a simulated causal explanation for events based on simple rules.
    """
    print(f"Getting causal explanation for event {event} in context {context}")
    
    explanations = []

    event_type = event.get("type")
    event_id = event.get("id")
    time_of_event = context.get("time")

    if event_type == "alert" and event_id == "alert1":
        explanations.append({"factor": "unusual_login_pattern", "impact": "high", "reason": "Login from new geo-location."})
        explanations.append({"factor": "compromised_credential", "impact": "medium", "reason": "Credential found on dark web."})
    elif event_type == "process_failure" and "high_cpu" in context.get("metrics", []):
        explanations.append({"factor": "resource_exhaustion", "impact": "high", "reason": "Process consumed excessive CPU."})
    else:
        explanations.append({"factor": "unknown", "impact": "low", "reason": "No specific causal factors identified."})

    return explanations
