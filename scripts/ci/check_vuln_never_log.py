import os
import re
import sys

# Never-log patterns
NEVER_LOG_PATTERNS = [
    r"sk-[a-zA-Z0-9]{48}", # OpenAI-like
    r"github_pat_[a-zA-Z0-9_]+", # GitHub PAT
    r"Authorization: bearer [a-zA-Z0-9\._\-]+",
    r"token=[a-zA-Z0-9\._\-]+"
]

def check_never_log(filepath):
    """Scans a file for patterns that must never be logged."""
    with open(filepath, errors="ignore") as f:
        content = f.read()
        for pattern in NEVER_LOG_PATTERNS:
            if re.search(pattern, content, re.IGNORECASE):
                print(f"❌ Pattern matching '{pattern}' found in {filepath}")
                return False
    return True

def main():
    target_dir = "artifacts/vuln-intel/hand-cve-private-sector"
    all_passed = True

    if not os.path.exists(target_dir):
        print("Target directory not found.")
        return

    for root, _, files in os.walk(target_dir):
        for filename in files:
            path = os.path.join(root, filename)
            if not check_never_log(path):
                all_passed = False

    if not all_passed:
        sys.exit(1)
    print("✅ Never-log check passed.")

if __name__ == "__main__":
    main()
