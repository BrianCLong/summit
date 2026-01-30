#!/usr/bin/env python3
import datetime
import json
import os
import re

LEDGER_PATH = "docs/security/SECURITY-ISSUE-LEDGER.md"
OUTPUT_PATH = "compliance-snapshot.json"

def parse_ledger(path):
    if not os.path.exists(path):
        return {"error": "Ledger not found"}

    with open(path) as f:
        content = f.read()

    snapshot = {
        "source": path,
        "timestamp": datetime.datetime.now(datetime.UTC).isoformat(),
        "summary": {},
        "status": "UNKNOWN"
    }

    # Extract Summary Table
    # Looking for:
    # **Total Issues:** 188
    # **Critical:** 19
    # ...

    patterns = {
        "total_issues": r"\*\*Total Issues:\*\* (\d+)",
        "critical": r"\*\*Critical:\*\* (\d+)",
        "high": r"\*\*High:\*\* (\d+)",
        "medium": r"\*\*Medium:\*\* (\d+)",
        "low": r"\*\*Low:\*\* (\d+)"
    }

    for key, pattern in patterns.items():
        match = re.search(pattern, content)
        if match:
            snapshot["summary"][key] = int(match.group(1))
        else:
            snapshot["summary"][key] = 0

    # Determine Status
    # Logic: If Critical > 0, FAIL. Else PASS (for now).
    if snapshot["summary"].get("critical", 0) > 0:
        snapshot["status"] = "FAIL"
        snapshot["blocking_reason"] = "Critical security issues present"
    else:
        snapshot["status"] = "PASS"

    # Extract Status line
    # **Status:** REMEDIATION IN PROGRESS
    status_match = re.search(r"\*\*Status:\*\* (.*)", content)
    if status_match:
        snapshot["ledger_status"] = status_match.group(1).strip()

    return snapshot

def main():
    print(f"Generating Compliance Snapshot from {LEDGER_PATH}...")
    data = parse_ledger(LEDGER_PATH)

    with open(OUTPUT_PATH, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"Snapshot written to {OUTPUT_PATH}")
    print(json.dumps(data, indent=2))

    if data.get("status") == "FAIL":
        print("::warning::Compliance Snapshot Status: FAIL")
        # We don't exit 1 here necessarily, as this might be just reporting.
        # But if used as a gate, it should exit 1.
        # For now, we return 0 but report failure in JSON.

if __name__ == "__main__":
    main()
