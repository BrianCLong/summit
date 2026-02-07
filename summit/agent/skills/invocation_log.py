from collections import defaultdict
from typing import Any, Dict

_METRICS = {
    "skill_available_count": 0,
    "skill_invoked_count": 0,
    "skills_offered": defaultdict(int),
    "skills_used": defaultdict(int)
}

def reset_metrics():
    global _METRICS
    _METRICS = {
        "skill_available_count": 0,
        "skill_invoked_count": 0,
        "skills_offered": defaultdict(int),
        "skills_used": defaultdict(int)
    }

def record_skill_availability(skill_names: list[str]):
    global _METRICS
    _METRICS["skill_available_count"] += len(skill_names)
    for name in skill_names:
        _METRICS["skills_offered"][name] += 1

def record_skill_invocation(skill_name: str):
    global _METRICS
    _METRICS["skill_invoked_count"] += 1
    _METRICS["skills_used"][skill_name] += 1

def get_metrics() -> dict[str, Any]:
    global _METRICS
    available = _METRICS["skill_available_count"]
    invoked = _METRICS["skill_invoked_count"]
    rate = (invoked / available) if available > 0 else 0.0

    return {
        "skill_available_count": available,
        "skill_invoked_count": invoked,
        "skill_invocation_rate": rate,
        "skills_offered": dict(_METRICS["skills_offered"]),
        "skills_used": dict(_METRICS["skills_used"])
    }
