#!/usr/bin/env python3
import argparse
import os
import sys

def create_file(filepath, content):
    with open(filepath, 'w') as f:
        f.write(content)
    print(f"Created {filepath}")

def init_target(target_slug, target_name, repo_url, docs_url):
    base_dir = f"docs/competitive/targets/{target_slug}"
    if os.path.exists(base_dir):
        print(f"Error: Target directory {base_dir} already exists.")
        sys.exit(1)

    os.makedirs(base_dir)
    print(f"Created directory {base_dir}")

    # TARGET.yml
    target_yml = f"""name: "{target_name}"
canonical_urls:
  repo: "{repo_url or ''}"
  docs: "{docs_url or ''}"
version: ""  # TODO: Fill in version
license: ""  # TODO: Fill in license type
last_release_date: ""  # TODO: YYYY-MM-DD
primary_language: ""
architecture_hints: []
"""
    create_file(os.path.join(base_dir, "TARGET.yml"), target_yml)

    # EVIDENCE_INDEX.yml
    evidence_index_yml = """# Evidence Index
# Format:
# - id: EVD-001
#   type: code | doc | blog | demo
#   url: ...
#   hash: ...
#   snippet: "..."
#   tags: []

evidence: []
"""
    create_file(os.path.join(base_dir, "EVIDENCE_INDEX.yml"), evidence_index_yml)

    # CLAIMS.md
    claims_md = """# Claims

## Testable Statements
<!-- Each claim must reference evidence IDs (e.g. [EVD-001]) -->

"""
    create_file(os.path.join(base_dir, "CLAIMS.md"), claims_md)

    # PARITY_MATRIX.yml
    parity_matrix_yml = """# Competitive Parity Matrix
# format:
# - feature: "Feature Name"
#   target_has: true/false
#   summit_has: true/false
#   gap_level: P0/P1/P2
#   evidence_ids: []

features: []
"""
    create_file(os.path.join(base_dir, "PARITY_MATRIX.yml"), parity_matrix_yml)

    print(f"Successfully initialized target '{target_slug}' in {base_dir}")

def main():
    parser = argparse.ArgumentParser(description="Summit Competitive Intelligence Tool")
    subparsers = parser.add_subparsers(dest="command", required=True)

    init_parser = subparsers.add_parser("init", help="Initialize a new competitive target")
    init_parser.add_argument("target_slug", help="Slug for the target (e.g. palantir-foundry)")
    init_parser.add_argument("--name", help="Display name of the target")
    init_parser.add_argument("--repo-url", help="URL to the target's repository")
    init_parser.add_argument("--docs-url", help="URL to the target's documentation")

    args = parser.parse_args()

    if args.command == "init":
        target_name = args.name if args.name else args.target_slug
        init_target(args.target_slug, target_name, args.repo_url, args.docs_url)

if __name__ == "__main__":
    main()
