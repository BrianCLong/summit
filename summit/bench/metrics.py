from typing import List, Dict, Any

def calculate_metrics(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    total = len(results)
    if total == 0:
        return {}

    passed = sum(1 for r in results if r.get("passed"))
    avg_deliberation = sum(r.get("deliberation_units", 0) for r in results) / total

    return {
        "pass_rate": passed / total,
        "avg_deliberation_units": avg_deliberation,
        "total_runs": total
    }
