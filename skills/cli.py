import argparse
import json
import os
import sys

from .discover import find_skills
from .index import build_index
from .policy import PolicyViolation, validate_skill


def main():
    parser = argparse.ArgumentParser(description="Summit Skills CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # build-index
    idx_parser = subparsers.add_parser("build-index", help="Build skills index")
    idx_parser.add_argument("--root", required=True, help="Root directory to scan")
    idx_parser.add_argument("--out", required=True, help="Output JSON file")

    # validate
    val_parser = subparsers.add_parser("validate", help="Validate skills against policy")
    val_parser.add_argument("--root", required=True, help="Root directory to scan")

    args = parser.parse_args()

    if args.command == "build-index":
        try:
            index = build_index(args.root)
            with open(args.out, 'w', encoding='utf-8') as f:
                json.dump(index, f, indent=2, sort_keys=True)
            print(f"Index written to {args.out}")
        except Exception as e:
            print(f"Error building index: {e}", file=sys.stderr)
            sys.exit(1)

    elif args.command == "validate":
        violations = []
        count = 0
        for skill in find_skills(args.root):
            count += 1
            try:
                validate_skill(skill)
            except PolicyViolation as e:
                violations.append(f"{skill.path}: {str(e)}")
            except Exception as e:
                violations.append(f"{skill.path}: Unexpected error: {str(e)}")

        if violations:
            print(f"Found {len(violations)} violations:")
            for v in violations:
                print(f"  - {v}")
            sys.exit(1)
        else:
            print(f"Validated {count} skills. No violations.")

if __name__ == "__main__":
    main()
