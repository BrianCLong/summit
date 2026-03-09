from typing import List, Dict, Any
import statistics

def compute_metrics(runs: List[Dict[Any, Any]]) -> Dict[str, Any]:
    if not runs:
        return {
            "total_runs": 0,
            "success_rate": 0,
            "durations": {"p50": 0, "p95": 0},
            "flakes": []
        }

    total = len(runs)
    successes = [r for r in runs if r.get("conclusion") == "success"]
    success_rate = len(successes) / total if total > 0 else 0

    durations = [r.get("duration_ms", 0) for r in runs if r.get("duration_ms", 0) > 0]
    p50 = 0
    p95 = 0
    if durations:
        durations.sort()
        p50 = statistics.median(durations)
        idx95 = int(len(durations) * 0.95)
        p95 = durations[min(idx95, len(durations)-1)]

    # Simple Flake Detection: same SHA, multiple runs, mixed results
    sha_results = {}
    for r in runs:
        sha = r.get("head_sha")
        if not sha: continue
        if sha not in sha_results:
            sha_results[sha] = set()
        sha_results[sha].add(r.get("conclusion"))

    flakes = []
    for sha, results in sha_results.items():
        if "success" in results and ("failure" in results or "timed_out" in results):
            flakes.append(sha)

    return {
        "total_runs": total,
        "success_rate": success_rate,
        "durations_ms": {
            "p50": p50,
            "p95": p95
        },
        "flake_count": len(flakes),
        "flake_shas": flakes
    }

def compute_trends(current: Dict[str, Any], previous: Dict[str, Any]) -> Dict[str, Any]:
    # Placeholder for trend analysis
    return {}
