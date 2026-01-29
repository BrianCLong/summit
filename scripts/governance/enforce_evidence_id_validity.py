#!/usr/bin/env python3
import os
import re
import sys


def extract_frontmatter(content):
    """
    Extracts key-value pairs from the frontmatter of a markdown file.
    Assumes frontmatter starts at the beginning of the file.
    """
    lines = content.splitlines()
    headers = {}
    for line in lines:
        if ':' in line:
            key, value = line.split(':', 1)
            headers[key.strip()] = value.strip()
        elif not line.strip():
            # Stop at first empty line (end of frontmatter)
            break
        elif line.startswith('#'):
            # Stop at first header (end of frontmatter)
            break
    return headers

def main():
    governance_dir = 'docs/governance'
    if not os.path.exists(governance_dir):
        print(f"Error: {governance_dir} does not exist.")
        sys.exit(1)

    violations = []
    files_checked = 0

    for filename in os.listdir(governance_dir):
        if filename.endswith('.md'):
            filepath = os.path.join(governance_dir, filename)
            with open(filepath, encoding='utf-8') as f:
                content = f.read()

            headers = extract_frontmatter(content)
            status = headers.get('Status', '').lower()
            evidence_ids = headers.get('Evidence-IDs', '').lower()

            if status == 'active':
                files_checked += 1
                if evidence_ids == 'none' or not evidence_ids:
                    violations.append(f"{filepath}: Active document has 'Evidence-IDs: {evidence_ids}' (must be a valid ID list)")

    print(f"Checked {files_checked} active governance documents.")

    if violations:
        print("\nGovernance Evidence Integrity Violations Found:")
        for v in violations:
            print(f"  - {v}")
        sys.exit(1)
    else:
        print("All active governance documents have valid Evidence-IDs.")
        sys.exit(0)

if __name__ == "__main__":
    main()
