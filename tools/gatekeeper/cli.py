"""Command line interface for the Gatekeeper RBAC policy linter."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import List

from .lint import LintIssue, expand_policy_globs, lint_policies, lint_roles
from .reporting import ConsoleReporter, JunitReporter


DEFAULT_JUNIT_PATH = Path("gatekeeper-report.xml")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="gatekeeper", description="RBAC policy linter")
    subparsers = parser.add_subparsers(dest="command")

    check = subparsers.add_parser("check", help="Lint Rego policies and role maps")
    check.add_argument(
        "--policies",
        nargs="+",
        required=True,
        help="Glob patterns to locate policy files (e.g. policies/**/*.rego)",
    )
    check.add_argument(
        "--roles",
        required=True,
        help="Path to roles YAML map.",
    )
    check.add_argument(
        "--junit",
        default=str(DEFAULT_JUNIT_PATH),
        help="Output path for generated JUnit report.",
    )
    check.add_argument(
        "--fix",
        action="store_true",
        help="Normalize the roles map in-place.",
    )

    return parser


def _run_check(args: argparse.Namespace) -> int:
    policy_paths = expand_policy_globs(args.policies)
    policy_result = lint_policies(policy_paths)

    roles_path = Path(args.roles)
    role_result = lint_roles(roles_path, normalize=args.fix)

    issues: List[LintIssue] = list(policy_result.issues) + list(role_result.issues)

    if args.fix and role_result.normalized is not None:
        roles_path.write_text(role_result.normalized, encoding="utf-8")

    junit_path = Path(args.junit)
    JunitReporter().write(issues, output=junit_path)
    ConsoleReporter().render(issues, checked_files=len(policy_result.checked_files), junit_path=junit_path)

    has_errors = any(issue.severity != "warning" for issue in issues)
    return 1 if has_errors else 0


def main(argv: List[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "check":
        return _run_check(args)

    parser.print_help()
    return 1


if __name__ == "__main__":  # pragma: no cover - CLI entrypoint
    sys.exit(main())
