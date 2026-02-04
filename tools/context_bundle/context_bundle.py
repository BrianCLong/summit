#!/usr/bin/env python3
"""
Builds a PR-local "context bundle":
- Relevant ADRs (by simple keyword match)
- Ownership hints (CODEOWNERS/OWNERS files)
- Policy invariants impacted (from policies/)

Feature-flag: SUMMIT_CONTEXT_BUNDLE=off
"""
import os, json, re

def find_adrs(keywords):
    adr_dir = "docs/ADR"
    matches = []
    if not os.path.exists(adr_dir):
        return matches

    for file in os.listdir(adr_dir):
        if file.endswith(".md"):
            path = os.path.join(adr_dir, file)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read().lower()
                    for kw in keywords:
                        if kw.lower() in content:
                            matches.append({"id": file, "keyword": kw})
                            break
            except Exception:
                continue
    return matches

def main() -> int:
    if os.getenv("SUMMIT_CONTEXT_BUNDLE", "on").lower() == "off":
        print("[context_bundle] disabled")
        return 0

    # Sample keywords to search for based on "changes"
    # In real CI, we'd get this from git diff
    keywords = ["graph", "security", "governance", "neo4j", "maestro"]

    adr_matches = find_adrs(keywords)

    bundle = {
        "adr_references": adr_matches,
        "ownership": ["platform-architecture"], # Mocked
        "impacted_policies": ["EG-001", "EG-002"] # Mocked
    }

    evidence_id = "EVD-ARCHROT-CTX-001"
    report = {
        "evidence_id": evidence_id,
        "summary": f"Context bundle generated with {len(adr_matches)} ADR references.",
        "artifacts": ["context_bundle.json"]
    }

    os.makedirs(f"evidence/{evidence_id}", exist_ok=True)

    with open(f"evidence/{evidence_id}/context_bundle.json", "w", encoding="utf-8") as f:
        json.dump(bundle, f, indent=2, sort_keys=True)
    with open(f"evidence/{evidence_id}/report.json", "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, sort_keys=True)
    with open(f"evidence/{evidence_id}/metrics.json", "w", encoding="utf-8") as f:
        json.dump({"evidence_id": evidence_id, "metrics": {"adr_count": len(adr_matches)}}, f, indent=2, sort_keys=True)
    with open(f"evidence/{evidence_id}/stamp.json", "w", encoding="utf-8") as f:
        json.dump({"evidence_id": evidence_id, "generated_at": "1970-01-01T00:00:00Z"}, f, indent=2, sort_keys=True)

    print(f"[context_bundle] OK - Found {len(adr_matches)} relevant ADRs")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
