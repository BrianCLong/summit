import json, os, sys
def check_budgets():
    evidence_dir = "evidence"
    if not os.path.exists(evidence_dir):
        if os.environ.get("RUN_GRAPHPERF_BENCHMARK") == "1": sys.exit(1)
        return
    for evid_id in os.listdir(evidence_dir):
        metrics_path = os.path.join(evidence_dir, evid_id, "metrics.json")
        if not os.path.exists(metrics_path): continue
        with open(metrics_path, "r") as f:
            metrics = json.load(f).get("metrics", {})
            if metrics.get("p95_ms", 0) > 500.0: sys.exit(1)
if __name__ == "__main__":
    check_budgets()
