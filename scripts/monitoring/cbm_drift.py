import json
from typing import Dict, Any

def detect_drift(current_metrics: Dict[str, Any], baseline: Dict[str, Any]) -> Dict[str, Any]:
    """Detect drift between current and baseline metrics."""
    drift = {}
    for k, v in current_metrics.items():
        if k in baseline:
            diff = abs(v - baseline[k])
            if diff > 0.1: # threshold
                drift[k] = {"diff": round(diff, 4), "alert": True}
    return drift

def write_drift_report(report: Dict[str, Any], path: str):
    """Write drift report deterministically."""
    with open(path, "w") as f:
        json.dump(report, f, sort_keys=True, indent=2)

def main():
    current = {"laundering_risk": 0.9}
    baseline = {"laundering_risk": 0.5}
    drift = detect_drift(current, baseline)
    write_drift_report(drift, "artifacts/cbm/drift_report.json")

if __name__ == "__main__":
    main()
