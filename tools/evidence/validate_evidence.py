import json
import sys
from pathlib import Path

import jsonschema

# Adjust path to find schemas relative to the repo root
# Assuming this script is run from repo root or we can find repo root
ROOT_DIR = Path(__file__).resolve().parents[2]
SCHEMA_DIR = ROOT_DIR / "evidence" / "schemas"

def _load(p: Path):
    if not p.exists():
        raise FileNotFoundError(f"File not found: {p}")
    return json.loads(p.read_text(encoding="utf-8"))

def validate_one(run_dir: Path) -> None:
    if not run_dir.exists():
         raise FileNotFoundError(f"Run directory not found: {run_dir}")

    report = run_dir / "report.json"
    metrics = run_dir / "metrics.json"
    stamp = run_dir / "stamp.json"

    print(f"Validating evidence in {run_dir}...")

    report_schema = _load(SCHEMA_DIR / "report.schema.json")
    metrics_schema = _load(SCHEMA_DIR / "metrics.schema.json")
    stamp_schema = _load(SCHEMA_DIR / "stamp.schema.json")

    print("Validating report.json...")
    jsonschema.validate(_load(report), report_schema)

    print("Validating metrics.json...")
    jsonschema.validate(_load(metrics), metrics_schema)

    print("Validating stamp.json...")
    jsonschema.validate(_load(stamp), stamp_schema)

def main() -> int:
    if len(sys.argv) != 2:
        print("usage: validate_evidence.py <evidence_run_dir>")
        return 2

    try:
        validate_one(Path(sys.argv[1]))
        print("OK")
        return 0
    except Exception as e:
        print(f"Validation FAILED: {e}")
        return 1

if __name__ == "__main__":
    raise SystemExit(main())
