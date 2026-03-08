import json
import os
from typing import Any, Dict, List


def load_registry(registry_path: str = None) -> list[str]:
    if registry_path is None:
        registry_path = os.path.join(os.path.dirname(__file__), "..", "registry", "pravda_domains.json")
    try:
        with open(registry_path) as f:
            return json.load(f)
    except FileNotFoundError:
        return []

def detect_surge(
    daily_counts: dict[str, dict[str, int]],
    target_topic: str,
    domains: list[str] = None
) -> list[dict[str, Any]]:
    """
    Detects if any of the monitored domains have a surge in the target topic.
    daily_counts: { "date": { "domain": topic_count } } (Simplified for this example)
    In a real scenario, this would likely be more complex (total count vs topic count).

    Here we assume input is:
    [
        {"date": "2026-01-01", "domain": "example.com", "topic_share": 0.05},
        {"date": "2026-01-02", "domain": "example.com", "topic_share": 0.50}
    ]
    """
    if domains is None:
        domains = load_registry()

    alerts = []

    # Simple logic: if topic_share > 0.3 (30%) and it was low before, alert.
    # This is a stub implementation.

    # Group by domain
    domain_history = {}
    for entry in daily_counts:
        domain = entry.get("domain")
        if domain not in domains:
            continue
        if domain not in domain_history:
            domain_history[domain] = []
        domain_history[domain].append(entry)

    for domain, history in domain_history.items():
        # Sort by date
        history.sort(key=lambda x: x["date"])

        for i in range(1, len(history)):
            prev = history[i-1]
            curr = history[i]

            if curr.get("topic") != target_topic:
                continue

            prev_share = prev.get("topic_share", 0.0)
            curr_share = curr.get("topic_share", 0.0)

            # Thresholds: Spike from < 10% to > 30%
            if prev_share < 0.10 and curr_share > 0.30:
                alerts.append({
                    "type": "surge",
                    "domain": domain,
                    "date": curr["date"],
                    "details": f"Topic '{target_topic}' surged from {prev_share:.1%} to {curr_share:.1%}"
                })

    return alerts
