import yaml
import json
import hashlib
from typing import Dict, Any, List
from summit.evidence.schema import generate_evidence_id

def load_suite(path: str) -> Dict[str, Any]:
    with open(path, "r") as f:
        return yaml.safe_load(f)

def run_benchmark(suite_path: str, mode: str = "standard") -> Dict[str, Any]:
    suite = load_suite(suite_path)
    results = []

    for case in suite.get("cases", []):
        # Mock execution for MWS
        run_id = hashlib.sha256(f"{case['id']}-{mode}".encode()).hexdigest()[:8]

        result = {
            "case_id": case["id"],
            "run_id": run_id,
            "mode": mode,
            "passed": True, # Mock pass
            "deliberation_units": 50 if mode == "composer15_like" else 10,
            "recursion_depth": 1 if mode == "composer15_like" else 0
        }
        results.append(result)

    summary = {
        "suite": suite["name"],
        "mode": mode,
        "total_cases": len(results),
        "pass_rate": 1.0,
        "results": results
    }

    # Save artifacts (mock)
    # with open(f"artifacts/bench/{summary['suite']}_summary.json", "w") as f:
    #     json.dump(summary, f)

    return summary
