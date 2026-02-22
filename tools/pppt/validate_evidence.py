#!/usr/bin/env python3
import json
import sys
import pathlib

def main():
    root = pathlib.Path(__file__).resolve().parents[2]
    idx_path = root / "evidence" / "index.json"

    if not idx_path.exists():
        print(f"Error: {idx_path} not found", file=sys.stderr)
        sys.exit(2)

    try:
        data = json.loads(idx_path.read_text())
    except Exception as e:
        print(f"Error reading {idx_path}: {e}", file=sys.stderr)
        sys.exit(2)

    ok = True
    items = data.get("items", {})

    # Check PPPT evidence
    found_pppt = False
    for ev_id, details in items.items():
        if "pppt" not in ev_id.lower():
            continue

        found_pppt = True
        files = details.get("files", [])
        if not files:
            files = details.get("artifacts", [])

        # We expect report, metrics, stamp in the list
        has_report = any("report.json" in f for f in files)
        has_metrics = any("metrics.json" in f for f in files)
        has_stamp = any("stamp.json" in f for f in files)

        if not (has_report and has_metrics and has_stamp):
            print(f"Evidence {ev_id} missing required artifacts (report, metrics, stamp)", file=sys.stderr)
            ok = False

        for fpath in files:
            p = root / fpath
            if not p.exists():
                print(f"Missing file for {ev_id}: {p}", file=sys.stderr)
                ok = False

    if not found_pppt:
        print("No PPPT evidence found in index.json", file=sys.stderr)
        ok = False

    sys.exit(0 if ok else 1)

if __name__ == "__main__":
    main()
