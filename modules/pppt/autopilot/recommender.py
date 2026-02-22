import os

ENABLED = os.getenv("PPPT_AUTOPILOT", "false").lower() == "true"

def recommend_next_step(metrics):
    if not ENABLED:
        return "Autopilot disabled"

    # Logic placeholder
    if metrics.get("pillar") == "demand_generation":
        return "Test new GTM messages"

    return "Analyze constraints"
