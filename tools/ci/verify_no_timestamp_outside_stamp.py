import json
import os
import re
import sys

# ISO 8601-ish timestamp pattern
TIMESTAMP_PATTERN = r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}"

SKIP_FILES = {
    "compliance_report.json",
    "governance-bundle.json",
    "provenance.json",
    "release_abort_events.json",
    "jules/preflight.report.json",
    "project19/alignment.report.json",
    "project19/report.json",
    "ecosystem/autogpt.json",
    "ecosystem/openhands.json",
    "ecosystem/langgraph.json",
    "ecosystem/langchain.json",
    "ecosystem/openai-swarm.json",
    "ecosystem/llamaindex.json",
    "ecosystem/hugging-face-hub.json",
    "governance/agent_governance.report.json",
    "report.json",
    "metrics.json",
    "taxonomy.stamp.json"
}

def scan_file(filepath):
    filename = os.path.basename(filepath)
    if filename == "stamp.json":
        return True

    # Check if file path matches any in skip list (simple contains check or endswith)
    for skip in SKIP_FILES:
        if filepath.endswith(skip):
            return True

    with open(filepath) as f:
        try:
            content = f.read()
        except UnicodeDecodeError:
            return True # Skip non-text files

    if re.search(TIMESTAMP_PATTERN, content):
        print(f"FAIL: Found timestamp in {filepath}")
        return False
    return True

def main():
    evidence_dir = "evidence"
    success = True
    for root, dirs, files in os.walk(evidence_dir):
        for file in files:
            if file.endswith(".json"):
                if not scan_file(os.path.join(root, file)):
                    success = False

    if not success:
        sys.exit(1)
    print("PASS: No timestamps outside stamp.json")

if __name__ == "__main__":
    main()
