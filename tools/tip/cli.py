"""Command line interface for the Tenant Isolation Prover (TIP)."""

from __future__ import annotations

import argparse
from collections.abc import Sequence

from .loader import (
    DEFAULT_MANIFEST_EXTENSIONS,
    DEFAULT_POLICY_EXTENSIONS,
    collect_files,
    load_kubernetes_documents,
    load_policy_documents,
)
from .prover import TenantIsolationProver, TipResult


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Kubernetes tenant isolation prover")
    parser.add_argument(
        "--manifests",
        nargs="+",
        required=True,
        help="Kubernetes manifest files, directories, or glob patterns",
    )
    parser.add_argument(
        "--policies",
        nargs="*",
        default=(),
        help="OPA/Gatekeeper policies (YAML or Rego)",
    )
    parser.add_argument(
        "--indent",
        type=int,
        default=2,
        help="JSON indentation level for output (default: 2)",
    )
    parser.add_argument(
        "--fail-on-warnings",
        action="store_true",
        help="Return a non-zero exit code if advisory warnings are produced",
    )
    return parser


def run_cli(argv: Sequence[str] | None = None) -> tuple[TipResult, int, str]:
    parser = build_parser()
    args = parser.parse_args(argv)

    manifest_files = collect_files(args.manifests, DEFAULT_MANIFEST_EXTENSIONS)
    if not manifest_files:
        parser.error("no manifest files found")
    policy_files = collect_files(args.policies, DEFAULT_POLICY_EXTENSIONS) if args.policies else []

    manifests = load_kubernetes_documents(manifest_files)
    policies = load_policy_documents(policy_files)

    prover = TenantIsolationProver(manifests, policies)
    result = prover.prove()
    output = result.to_json(indent=args.indent)

    exit_code = 0
    if result.status != "passed":
        exit_code = 1
    elif args.fail_on_warnings and result.warnings:
        exit_code = 2

    return result, exit_code, output


def main(argv: Sequence[str] | None = None) -> int:
    result, exit_code, output = run_cli(argv)
    print(output)
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
