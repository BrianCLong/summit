"""Command line interface for the MigrateVet SQL migration linter."""

from __future__ import annotations

import argparse
import os
import sys
from collections.abc import Iterable
from pathlib import Path

from .scanner import scan_directory


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="migratevet", description="Safe DB migration linter")
    subparsers = parser.add_subparsers(dest="command")

    check_parser = subparsers.add_parser("check", help="Run migration checks")
    check_parser.add_argument("--dir", required=True, help="Directory containing SQL migrations")
    check_parser.add_argument("--dialect", required=True, help="SQL dialect (e.g. postgres)")
    check_parser.add_argument(
        "--enforce",
        action="store_true",
        help="Fail with a non-zero exit code on findings (defaults to warn-only).",
    )
    check_parser.add_argument(
        "--warn-only",
        action="store_true",
        help="Force warn-only mode even if MIGRATEVET_ENFORCE is set.",
    )
    return parser


def main(argv: Iterable[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(list(argv) if argv is not None else None)

    if args.command == "check":
        return _run_check(args)

    parser.print_help()
    return 0


def _run_check(args: argparse.Namespace) -> int:
    root = Path(args.dir)
    if not root.exists():
        print(f"No such directory: {root}", file=sys.stderr)
        return 2

    dialect = args.dialect.lower()
    enforce_env = os.environ.get("MIGRATEVET_ENFORCE", "").lower() in {"1", "true", "yes"}
    enforce = (args.enforce or enforce_env) and not args.warn_only

    try:
        issues = scan_directory(root, dialect)
    except ValueError as exc:  # Unsupported dialect
        print(str(exc), file=sys.stderr)
        return 2

    severity = "ERROR" if enforce else "WARN"
    issues = sorted(issues, key=lambda item: (str(item.file_path), item.line, item.code))
    if issues:
        for issue in issues:
            print(issue.format(severity=severity))
        unique_files = {issue.file_path for issue in issues}
        mode = "enforce" if enforce else "warn-only"
        print(
            f"Found {len(issues)} issue(s) across {len(unique_files)} file(s) (mode: {mode}).",
            file=sys.stderr,
        )
        return 1 if enforce else 0

    print(f"No issues found for dialect '{dialect}' in {root}.")
    return 0


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
