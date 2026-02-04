import json
import os
import sys

def check_budgets():
    """
    Enforces performance budgets by inspecting generated evidence artifacts.
    """
    evidence_dir = "evidence"
    if not os.path.exists(evidence_dir):
        print("No evidence found in evidence/")
        if os.environ.get("RUN_GRAPHPERF_BENCHMARK") == "1":
            print("ERROR: Benchmarks were supposed to run but no evidence was found.")
            sys.exit(1)
        return

    # Budgets (could be moved to a config file)
    P95_BUDGET_MS = 500.0
    DBHITS_BUDGET = 1000

    found_evidence = False
    for evid_id in os.listdir(evidence_dir):
        metrics_path = os.path.join(evidence_dir, evid_id, "metrics.json")
        if not os.path.exists(metrics_path):
            continue

        found_evidence = True
        with open(metrics_path, "r") as f:
            try:
                data = json.load(f)
                metrics = data.get("metrics", {})

                p95 = metrics.get("p95_ms", 0)
                db_hits = metrics.get("db_hits", 0)

                print(f"Checking {evid_id}: P95={p95:.2f}ms, dbHits={db_hits}")

                if p95 > P95_BUDGET_MS:
                    print(f"FAIL: {evid_id} P95 exceeds budget of {P95_BUDGET_MS}ms")
                    sys.exit(1)

                if db_hits > DBHITS_BUDGET:
                    print(f"FAIL: {evid_id} dbHits exceeds budget of {DBHITS_BUDGET}")
                    sys.exit(1)

            except Exception as e:
                print(f"Error parsing metrics for {evid_id}: {e}")
                sys.exit(1)

    if not found_evidence:
        print("Warning: No metrics.json files found to verify.")
        if os.environ.get("RUN_GRAPHPERF_BENCHMARK") == "1":
            print("ERROR: Benchmarks were supposed to run but no metrics were found.")
            sys.exit(1)
    else:
        print("OK: All performance budgets met.")

if __name__ == "__main__":
    check_budgets()
