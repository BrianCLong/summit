#!/usr/bin/env python3
import re
import sys
import os
import subprocess

PATTERNS = {
    "AWS Access Key": r"AKIA[0-9A-Z]{16}",
    "Private Key": r"-----BEGIN.*PRIVATE KEY-----",
    "OpenAI Key": r"sk-[a-zA-Z0-9]{32,}",
    "Generic Token": r"bearer [a-zA-Z0-9\-\._~\+\/]{30,}",
    "Slack Token": r"xox[baprs]-([0-9a-zA-Z]{10,48})?",
    "Google API Key": r"AIza[0-9A-Za-z\\-_]{35}",
    "Github Token": r"(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36}"
}

def get_staged_files():
    try:
        result = subprocess.run(["git", "diff", "--name-only", "--cached"], capture_output=True, text=True)
        return [f for f in result.stdout.splitlines() if os.path.isfile(f)]
    except Exception:
        return []

def scan_file(filepath):
    issues = []
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            for name, pattern in PATTERNS.items():
                if re.search(pattern, content):
                    # Filter out example files or mock data if needed
                    if "example" in filepath or "mock" in filepath.lower() or "test" in filepath.lower():
                        continue
                    issues.append(f"Found {name}")
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
    return issues

def main():
    print("Running Secret Scanner...")
    files = get_staged_files()
    if not files:
        if len(sys.argv) > 1 and sys.argv[1] == "--all":
             result = subprocess.run(["git", "ls-files"], capture_output=True, text=True)
             files = result.stdout.splitlines()
        else:
             print("No staged files to scan.")
             return 0

    found_secrets = False
    for filepath in files:
        if filepath.endswith(".lock") or filepath.endswith(".png") or filepath.endswith(".jpg"):
            continue

        issues = scan_file(filepath)
        if issues:
            print(f"❌ SECRET DETECTED in {filepath}: {', '.join(issues)}")
            found_secrets = True

    if found_secrets:
        print("Commit blocked. Please remove secrets before committing.")
        sys.exit(1)

    print("✅ No secrets found.")
    sys.exit(0)

if __name__ == "__main__":
    main()
