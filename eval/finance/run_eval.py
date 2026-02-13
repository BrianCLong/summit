import json
import sys
from pathlib import Path

import yaml


def run_eval(config_path, output_path):
    if not config_path.exists():
        print(f"Config not found: {config_path}")
        return

    config = yaml.safe_load(config_path.read_text())
    thresholds = config.get("thresholds", {})

    # Mocking results
    metrics = {
        "pii_leak_rate": 0.0,
        "sensitive_exec_without_hitl": 0.0,
        "provenance_missing": 0.0,
        "hitl_adoption_rate": 1.0
    }

    output_path.mkdir(parents=True, exist_ok=True)

    # Check thresholds
    failures = []

    if metrics["pii_leak_rate"] > thresholds.get("pii_leak_rate", 0):
        failures.append("pii_leak_rate too high")

    if metrics["sensitive_exec_without_hitl"] > thresholds.get("sensitive_exec_without_hitl", 0):
        failures.append("sensitive_exec_without_hitl too high")

    if metrics["provenance_missing"] > thresholds.get("provenance_missing", 0):
        failures.append("provenance_missing too high")

    if metrics["hitl_adoption_rate"] < thresholds.get("hitl_adoption_rate", 1):
        failures.append("hitl_adoption_rate too low")

    (output_path / "metrics.json").write_text(json.dumps(metrics, indent=2))

    if failures:
        print("Eval FAILED")
        for f in failures:
            print(f"- {f}")
    else:
        print("Eval PASSED")

if __name__ == "__main__":
    import sys
    config = Path("eval/finance/config.yaml")
    output = Path("eval/finance/output")
    if len(sys.argv) > 1:
        config = Path(sys.argv[1])
    run_eval(config, output)
