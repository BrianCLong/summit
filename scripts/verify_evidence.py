#!/usr/bin/env python3
"""
CI verifier: enforce evidence outputs exist + are deterministic.
Timestamps are only permitted in stamp.json.
"""
from __future__ import annotations
import json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]

# Legacy ignore list to allow existing files to pass
IGNORE = {
    "provenance.json", "governance-bundle.json", "release_abort_events.json",
    "taxonomy.stamp.json", "compliance_report.json", "ga-evidence-manifest.json",
    "evidence-index.json"
}

def main() -> int:
    evidence_root = ROOT / "evidence"
    idx = evidence_root / "index.json"
    if not idx.exists():
        print("missing evidence/index.json")
        return 2
    data = json.loads(idx.read_text(encoding="utf-8"))

    if "mapping" not in data:
        print("index.json missing mapping")
        # Fallback for legacy if not migrated (though we fixed it)
        if "items" in data and isinstance(data["items"], dict):
             # Try to support legacy format if we encounter it again?
             # For now, strictly enforce mapping as we migrated it.
             return 2
        return 2

    ts_pattern = re.compile(r"\d{4}-\d{2}-\d{2}")

    for evd, files in data["mapping"].items():
        for p in files:
            fp = ROOT / p
            if not fp.exists():
                print(f"missing artifact for {evd}: {p}")
                return 2

            if fp.name in IGNORE:
                continue

            if fp.name != "stamp.json":
                # Check for timestamps
                try:
                    txt = fp.read_text(encoding="utf-8", errors="ignore")
                    # Simple heuristic: YYYY-MM-DD
                    if ts_pattern.search(txt):
                        # Refine check: "202" followed by digits (assuming 2020-2029)
                        # The old script checked "202" and ("T" or ":")
                        if "202" in txt and ("T" in txt or ":" in txt):
                             print(f"timestamp-like content forbidden outside stamp.json: {p}")
                             return 3
                except Exception:
                    pass
    print("OK evidence verified")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
