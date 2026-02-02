#!/usr/bin/env python3
import os, json

def main() -> int:
    if os.getenv("SUMMIT_COMPLEXITY_BUDGET", "on").lower() == "off":
        print("[complexity_budget] disabled")
        return 0
    # TODO: compute metrics over changed files only
    evidence_dir = "evidence/EVD-ARCHROT-CPLX-001"
    os.makedirs(evidence_dir, exist_ok=True)

    with open(os.path.join(evidence_dir, "report.json"),"w",encoding="utf-8") as f:
        json.dump({"evidence_id":"EVD-ARCHROT-CPLX-001","summary":"stub","artifacts":[]}, f, indent=2, sort_keys=True)
    with open(os.path.join(evidence_dir, "metrics.json"),"w",encoding="utf-8") as f:
        json.dump({"evidence_id":"EVD-ARCHROT-CPLX-001","metrics":{"note":"TODO"}}, f, indent=2, sort_keys=True)
    with open(os.path.join(evidence_dir, "stamp.json"),"w",encoding="utf-8") as f:
        json.dump({"evidence_id":"EVD-ARCHROT-CPLX-001","generated_at":"1970-01-01T00:00:00Z"}, f, indent=2, sort_keys=True)
    print("[complexity_budget] OK (stub)")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
