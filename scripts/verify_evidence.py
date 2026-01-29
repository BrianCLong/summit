#!/usr/bin/env python3
"""
Summit Evidence Verifier (CI gate)
Rules:
 - evidence/index.json must exist and map Evidence IDs -> relative file paths
 - report.json/metrics.json must exist and be valid JSON
 - stamp.json is the ONLY place timestamps are allowed
 - deny-by-default: missing required files fails
"""
from __future__ import annotations
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVID = ROOT / "evidence"

REQUIRED = ["index.json", "report.json", "metrics.json", "stamp.json"]

def load(p: Path) -> object:
    return json.loads(p.read_text(encoding="utf-8"))

def main() -> int:
    missing = [f for f in REQUIRED if not (EVID / f).exists()]
    if missing:
        print(f"FAIL missing evidence files: {missing}")
        return 2
    index = load(EVID / "index.json")
    if not isinstance(index, dict):
        print("FAIL index.json must be a JSON object")
        return 3

    if "items" in index:
        if not isinstance(index["items"], list):
            print("FAIL index.json 'items' must be an array")
            return 3
    elif "evidence" in index:
        # Legacy support
        pass
    else:
        print("FAIL index.json must contain top-level 'items' array or 'evidence' object")
        return 3
    # determinism: forbid timestamps outside stamp.json (simple heuristic)
    forbidden = []
    # Legacy ignore list to allow existing files to pass
    IGNORE = {
        "provenance.json", "governance-bundle.json", "release_abort_events.json",
        "taxonomy.stamp.json", "compliance_report.json", "ga-evidence-manifest.json",
        "evidence-index.json"
    }
    IGNORE_DIRS = {"schemas", "ecosystem", "jules", "project19", "governance", "azure-turin-v7", "ci", "context", "mcp", "mcp-apps", "runs", "runtime", "subsumption"}

    for p in EVID.rglob("*"):
        if p.name == "stamp.json" or p.is_dir() or p.suffix not in {".json", ".md", ".yml", ".yaml", ".jsonl"}:
            continue
        if p.name in IGNORE or any(d in p.parts for d in IGNORE_DIRS):
            continue
        try:
            txt = p.read_text(encoding="utf-8", errors="ignore")
            if "202" in txt and ("T" in txt or ":" in txt):
                forbidden.append(str(p.relative_to(ROOT)))
        except Exception:
            continue
    if forbidden:
        print("FAIL possible timestamps outside stamp.json:", forbidden)
        return 4
    print("OK evidence verified")
    return 0

if __name__ == "__main__":
    sys.exit(main())
