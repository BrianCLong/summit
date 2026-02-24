#!/usr/bin/env python3
import json
from pathlib import Path

def run_detectors(data: dict) -> dict:
    # Stub: purely fixture-based aggregate metrics
    nv = sum(p["v"] for p in data.get("narrative_series", []))
    iv = sum(p["v"] for p in data.get("incident_series", []))
    return {"narrative_volume": nv, "incident_volume": iv}

def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--fixture", required=True)
    ap.add_argument("--outdir", default="evidence/reports")
    args = ap.parse_args()

    fx = json.loads(Path(args.fixture).read_text(encoding="utf-8"))
    metrics = run_detectors(fx)

    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    # Determinism: no timestamps here; stamps are produced elsewhere in pipeline if needed
    report = {
        "evidence_id": "EVD-COGWAR-2026-EVENT-002",
        "summary": "event playbook fixture run",
        "artifacts": [],
        "determinism": {"timestamps_only_in": ["stamp.json"]}
    }
    (outdir / "event_report.json").write_text(json.dumps(report, indent=2, sort_keys=True), encoding="utf-8")
    (outdir / "event_metrics.json").write_text(json.dumps({"evidence_id": report["evidence_id"], "metrics": metrics}, indent=2, sort_keys=True), encoding="utf-8")

if __name__ == "__main__":
    main()
