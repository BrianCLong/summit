import json
import os
from pathlib import Path

def check_drift(artifact_dir: str):
    p = Path(artifact_dir)
    ledgers = list(p.glob("**/ledger.json"))

    report = {
        "drift_detected": False,
        "avg_cost": 0.0,
        "total_ledgers": len(ledgers),
        "alerts": []
    }

    total_cost = 0.0
    for ledger_path in ledgers:
        with open(ledger_path) as f:
            data = json.load(f)
            total_cost += data.get("budget", {}).get("total_consumed", 0.0)

    if ledgers:
        report["avg_cost"] = total_cost / len(ledgers)

    # Example drift condition: avg cost too high
    if report["avg_cost"] > 100.0:
        report["drift_detected"] = True
        report["alerts"].append("Average cost exceeded threshold")

    return report

if __name__ == "__main__":
    # Dummy run
    results = check_drift("evidence")
    print(json.dumps(results, indent=2))
