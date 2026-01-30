#!/usr/bin/env python3
import os
import re
import sys
import subprocess

def get_changed_files():
    # In CI, use base ref. Locally, use a more permissive diff.
    base_branch = os.environ.get('GITHUB_BASE_REF')
    if base_branch:
        cmd = ['git', 'diff', '--name-only', f'{base_branch}...HEAD']
    else:
        # Locally, check staged and unstaged changes
        cmd = ['git', 'diff', 'HEAD', '--name-only']

    try:
        output = subprocess.check_output(cmd, stderr=subprocess.STDOUT).decode()
        return output.splitlines()
    except Exception as e:
        print(f"Warning: Could not get changed files: {e}")
        return []

def check_competitive_intel_files():
    changed_files = get_changed_files()
    competitive_dirs = ['docs/competitive', 'competitive']

    # Filter changed files that are in competitive directories and are markdown
    target_files = []
    for f in changed_files:
        if any(f.startswith(d + '/') for d in competitive_dirs) and f.endswith('.md'):
            target_files.append(f)

    if not target_files:
        print("No changed competitive intel files detected. Skipping.")
        return True

    failed = False
    for filepath in target_files:
        if not os.path.exists(filepath):
            continue

        with open(filepath, 'r') as f:
            content = f.read()

            # Simple check for EVID references
            evid_matches = re.findall(r'EVID-\d+', content)
            if not evid_matches:
                print(f"FAIL: {filepath} contains no EVID references.")
                failed = True
            else:
                print(f"PASS: {filepath} has {len(evid_matches)} EVID references.")

    return not failed

if __name__ == "__main__":
    if check_competitive_intel_files():
        print("Competitive Intel Gate PASSED")
        sys.exit(0)
    else:
        print("Competitive Intel Gate FAILED")
        sys.exit(1)
