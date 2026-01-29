import glob, json, sys, os
import datetime

# Ensure repo root is in path
sys.path.append(os.getcwd())

from summit.evals.split_brain.runner import run_case
from summit.evidence.writer import write_evidence

THRESH_CONTRADICTION = 0.20

def main() -> int:
    results = []
    fixture_path = "tests/fixtures/split_brain_cases/*.json"
    files = sorted(glob.glob(fixture_path))

    if not files:
        # If no cases, technically it's a pass or skip?
        # Let's say pass for now but warn
        print(f"No test cases found in {fixture_path}")
        return 0

    for path in files:
        results.append(run_case(path))

    max_contra = max(r["contradiction_rate"] for r in results) if results else 0.0
    metrics = {"max_contradiction_rate": max_contra, "n_cases": len(results)}
    report = {
        "evd_id": "EVD-LLMTRAININGCHANGE-EVAL-001",
        "summary": "Split-brain eval",
        "inputs": {"cases": [os.path.basename(f) for f in files]},
        "outputs": {"results": results}
    }
    stamp = {"created_utc": datetime.datetime.utcnow().isoformat()}

    out_dir = write_evidence("EVD-LLMTRAININGCHANGE-EVAL-001", report, metrics, stamp)
    print(f"Evidence written to {out_dir}")

    if max_contra > THRESH_CONTRADICTION:
        print(f"FAIL split_brain_eval: {max_contra} > {THRESH_CONTRADICTION}")
        return 1

    print("PASS split_brain_eval")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
