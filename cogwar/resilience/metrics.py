from typing import Any, Dict


def calculate_readiness_score(drill_results: list) -> float:
    if not drill_results:
        return 0.0

    success_count = sum(1 for d in drill_results if d.get("success", False))
    return success_count / len(drill_results)

def create_metric(name: str, value: float, unit: str, time_window: str) -> dict[str, Any]:
    return {
        "metric_id": f"METRIC-{name.upper().replace(' ', '_')}",
        "name": name,
        "value": value,
        "unit": unit,
        "time_window": time_window,
        "population_scope": "internal_team"
    }
