#!/usr/bin/env python3
import json
import argparse
import hashlib
import yaml
from pathlib import Path
from datetime import datetime

def is_action_allowed(action: str, policy_path: str = "policy/event_policy.yaml") -> bool:
    p = Path(policy_path)
    if not p.exists():
        return False

    with open(p, "r", encoding="utf-8") as f:
        policy = yaml.safe_load(f)

    deny_list = [d["action"] for d in policy.get("policy", {}).get("deny", [])]
    allow_list = [a["action"] for a in policy.get("policy", {}).get("allow", [])]

    if action in deny_list:
        return False
    if action in allow_list:
        return True
    return False # Deny by default

def run_detectors(data: dict) -> dict:
    # Stub: purely fixture-based aggregate metrics
    nv = sum(p["v"] for p in data.get("narrative_series", []))
    iv = sum(p["v"] for p in data.get("incident_series", []))
    return {"narrative_volume": nv, "incident_volume": iv}

def run_fusion(data: dict) -> dict:
    narrative_series = data.get("narrative_series", [])
    incident_series = data.get("incident_series", [])

    # Simple correlation: sum of (narrative_v * incident_v) at same time t
    score = 0
    n_map = {p["t"]: p["v"] for p in narrative_series}
    i_map = {p["t"]: p["v"] for p in incident_series}

    all_t = set(n_map.keys()) | set(i_map.keys())
    for t in all_t:
        score += n_map.get(t, 0) * i_map.get(t, 0)

    return {"fusion_coincidence_score": score, "fusion_hit": score > 50}

def get_sha256(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fixture", required=True)
    ap.add_argument("--outdir", default="evidence/reports")
    ap.add_argument("--item-slug", default="cogwar-2026-event-windows")
    ap.add_argument("--evidence-id", default="EVD-COGWAR-2026-EVENT-002")
    ap.add_argument("--fusion", action="store_true", help="Enable fusion correlator")
    args = ap.parse_args()

    # Governance check
    if not is_action_allowed("compute_aggregate_metrics") or not is_action_allowed("emit_evidence_bundle"):
        print("Governance Error: Required actions not allowed by policy.")
        return

    fx_path = Path(args.fixture)
    if not fx_path.exists():
        print(f"Fixture not found: {args.fixture}")
        return

    fx = json.loads(fx_path.read_text(encoding="utf-8"))
    metrics_data = run_detectors(fx)

    if args.fusion:
        fusion_metrics = run_fusion(fx)
        metrics_data.update(fusion_metrics)
        evidence_id = "EVD-COGWAR-2026-EVENT-003"
    else:
        evidence_id = args.evidence_id

    outdir = Path(args.outdir).resolve()
    outdir.mkdir(parents=True, exist_ok=True)

    run_id = fx["event"]["id"]
    run_dir = outdir / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    # 1. Metrics
    metrics_content = json.dumps({
        "evidence_id": evidence_id,
        "metrics": metrics_data
    }, indent=2, sort_keys=True)
    metrics_file = run_dir / "metrics.json"
    metrics_file.write_text(metrics_content, encoding="utf-8")

    # 2. Stamp
    stamp_content = json.dumps({
        "evidence_id": evidence_id,
        "created_utc": "2026-01-01T00:00:00Z", # Deterministic for tests
        "git_commit": "HEAD"
    }, indent=2, sort_keys=True)
    stamp_file = run_dir / "stamp.json"
    stamp_file.write_text(stamp_content, encoding="utf-8")

    # 3. Report
    report_data = {
        "evidence_id": evidence_id,
        "item_slug": args.item_slug,
        "summary": f"event playbook fixture run for {run_id} (fusion={'on' if args.fusion else 'off'})",
        "artifacts": [
            {
                "path": str(metrics_file.relative_to(Path.cwd().resolve())),
                "sha256": get_sha256(metrics_content)
            },
            {
                "path": str(stamp_file.relative_to(Path.cwd().resolve())),
                "sha256": get_sha256(stamp_content)
            }
        ]
    }
    report_content = json.dumps(report_data, indent=2, sort_keys=True)
    report_file = run_dir / "report.json"
    report_file.write_text(report_content, encoding="utf-8")

    print(f"Evidence generated in {run_dir} with ID {evidence_id}")

if __name__ == "__main__":
    main()
