"""
CI Gate: validate evidence artifacts exist and match schemas.
Deny-by-default: fails if any required artifact missing or invalid.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REQUIRED = ["report.json", "metrics.json", "stamp.json", "index.json"]

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--path", default="evidence", help="Path to evidence directory")
    args = parser.parse_args()

    d = Path(args.path)
    if not d.exists():
        print(f"evidence_directory_missing={d}")
        return 2

    missing = [f for f in REQUIRED if not (d / f).exists()]
    if missing:
        print(f"missing_evidence_files={missing}")
        return 2
    # TODO: add jsonschema validation once Summit’s deps/policy allow it.
    # For now, ensure valid JSON.
    for f in REQUIRED:
        try:
            json.loads((d / f).read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            print(f"invalid_json_file={f} error={e}")
            return 2
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
