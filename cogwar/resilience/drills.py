import json
from datetime import UTC, datetime, timezone
from pathlib import Path

from .metrics import calculate_readiness_score, create_metric


def load_scenario(scenario_id: str, fixtures_dir: Path) -> dict:
    path = fixtures_dir / "scenarios.json"
    if not path.exists():
        return None

    scenarios = json.loads(path.read_text())
    for s in scenarios:
        if s["id"] == scenario_id:
            return s
    return None

def run_drill(scenario_id: str, fixtures_dir: Path) -> dict:
    scenario = load_scenario(scenario_id, fixtures_dir)
    if not scenario:
        return {"error": "Scenario not found", "success": False}

    # Simulate drill execution (in real system this would interact with components)
    # Here we just verify if the scenario is defensive

    is_defensive = scenario.get("type") == "defensive"

    result = {
        "scenario_id": scenario_id,
        "success": is_defensive, # Fail if trying to run offensive drill
        "timestamp": datetime.now(UTC).isoformat()
    }

    return result
