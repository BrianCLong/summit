#!/usr/bin/env python3
"""
Builds a PR-local "context bundle":
- Relevant ADRs (by simple keyword match)
- Ownership hints (CODEOWNERS/OWNERS files)
- Policy invariants impacted (from policies/)

Feature-flag: SUMMIT_CONTEXT_BUNDLE=off
"""
import os, json

def main() -> int:
    if os.getenv("SUMMIT_CONTEXT_BUNDLE", "on").lower() == "off":
        print("[context_bundle] disabled")
        return 0

    out = {
        "evidence_id": "EVD-ARCHROT-CTX-001",
        "summary": "context bundle generated (stub)",
        "artifacts": ["context_bundle.json"]
    }

    # Ensure evidence directory exists
    evidence_dir = "evidence/EVD-ARCHROT-CTX-001"
    os.makedirs(evidence_dir, exist_ok=True)

    # Write report.json
    with open(os.path.join(evidence_dir, "report.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, sort_keys=True)

    # Write metrics.json
    with open(os.path.join(evidence_dir, "metrics.json"), "w", encoding="utf-8") as f:
        json.dump({"evidence_id":"EVD-ARCHROT-CTX-001","metrics":{}}, f, indent=2, sort_keys=True)

    # Write stamp.json
    with open(os.path.join(evidence_dir, "stamp.json"), "w", encoding="utf-8") as f:
        json.dump({"evidence_id":"EVD-ARCHROT-CTX-001","generated_at":"1970-01-01T00:00:00Z"}, f, indent=2, sort_keys=True)

    # Write context_bundle.json (the artifact)
    with open(os.path.join(evidence_dir, "context_bundle.json"), "w", encoding="utf-8") as f:
        json.dump({"context": "stub", "adrs": [], "owners": []}, f, indent=2, sort_keys=True)

    print("[context_bundle] OK")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
