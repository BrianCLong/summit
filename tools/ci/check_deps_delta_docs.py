#!/usr/bin/env python3
import argparse
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--expected-pr", required=True, help="PR number (e.g. 1)")
    args = parser.parse_args()

    doc_path = Path("docs/deps") / f"PR-{args.expected_pr}.md"
    if not doc_path.exists():
        print(f"Missing dependency delta doc: {doc_path}")
        return 2

    content = doc_path.read_text().strip()
    if not content:
        print(f"Dependency delta doc is empty: {doc_path}")
        return 3

    print(f"Dependency delta doc found: {doc_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
