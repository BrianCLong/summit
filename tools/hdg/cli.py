"""Command line interface for HDG."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from .determinism import deterministic_run, enforce_determinism
from .receipt import ReceiptEmitter
from .scanner import VarianceScanner, load_args, load_kwargs


def _parse_extra_env(values: list[str]) -> dict[str, str]:
    result: dict[str, str] = {}
    for item in values:
        if "=" not in item:
            raise ValueError("Environment overrides must be formatted as KEY=VALUE")
        key, value = item.split("=", 1)
        result[key] = value
    return result


def cmd_enforce(args: argparse.Namespace) -> int:
    extra_env = _parse_extra_env(args.env or [])
    state = enforce_determinism(
        seed=args.seed,
        precision=args.precision,
        cudnn_deterministic=not args.allow_cudnn_nondet,
        allow_tf32=args.allow_tf32,
        extra_env=extra_env,
    )
    print(json.dumps(state.frameworks, indent=2, default=str))
    return 0


def cmd_receipt(args: argparse.Namespace) -> int:
    env_overrides = _parse_extra_env(args.env or [])
    with deterministic_run(
        seed=args.seed,
        precision=args.precision,
        cudnn_deterministic=not args.allow_cudnn_nondet,
        allow_tf32=args.allow_tf32,
        extra_env=env_overrides,
    ) as state:
        graph = None
        if args.graph:
            graph_path = Path(args.graph)
            graph = graph_path.read_bytes()
        extra: dict[str, Any] = {"artifacts": args.artifact or []}
        if args.notes:
            extra["notes"] = args.notes
        receipt = ReceiptEmitter(state, graph=graph, extra=extra).build()
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        receipt.write(output_path)
        print(f"Receipt written to {output_path}")
    return 0


def cmd_scan(args: argparse.Namespace) -> int:
    scanner = VarianceScanner(
        callable_path=args.callable,
        args=load_args(args.args),
        kwargs=load_kwargs(args.kwargs),
    )
    result = scanner.run(runs=args.runs)
    payload = result.to_dict()
    print(json.dumps(payload, indent=2))
    if result.nondeterministic_ops:
        print("Non-deterministic operations detected:")
        for op in result.nondeterministic_ops:
            print(f"  - {op}")
        return 1
    if not result.identical:
        print("Warning: output bytes differed across runs despite no flagged ops")
        return 2
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Hardware Determinism Guard")
    subparsers = parser.add_subparsers(dest="command", required=True)

    enforce_parser = subparsers.add_parser("enforce", help="Apply deterministic guards")
    enforce_parser.add_argument("--seed", type=int, default=None, help="Seed to apply across frameworks")
    enforce_parser.add_argument("--precision", choices=["fp32", "bf16"], default="fp32")
    enforce_parser.add_argument("--allow-tf32", action="store_true", help="Permit TF32 matmul kernels")
    enforce_parser.add_argument(
        "--allow-cudnn-nondet",
        action="store_true",
        help="Disable the CuDNN deterministic guard",
    )
    enforce_parser.add_argument("--env", action="append", help="Extra environment overrides (KEY=VALUE)")
    enforce_parser.set_defaults(func=cmd_enforce)

    receipt_parser = subparsers.add_parser("receipt", help="Emit a determinism receipt")
    receipt_parser.add_argument("--seed", type=int, default=None)
    receipt_parser.add_argument("--precision", choices=["fp32", "bf16"], default="fp32")
    receipt_parser.add_argument("--allow-tf32", action="store_true")
    receipt_parser.add_argument("--allow-cudnn-nondet", action="store_true")
    receipt_parser.add_argument("--env", action="append")
    receipt_parser.add_argument("--graph", help="Path to a file describing the op graph")
    receipt_parser.add_argument("--artifact", action="append", help="Artifact paths to record")
    receipt_parser.add_argument("--notes", help="Free-form notes to include")
    receipt_parser.add_argument("--output", required=True, help="Location for the receipt JSON")
    receipt_parser.set_defaults(func=cmd_receipt)

    scan_parser = subparsers.add_parser("scan", help="Scan a callable for nondeterministic ops")
    scan_parser.add_argument("--callable", required=True, help="Target callable as module:function")
    scan_parser.add_argument("--args", help="JSON encoded positional arguments")
    scan_parser.add_argument("--kwargs", help="JSON encoded keyword arguments")
    scan_parser.add_argument("--runs", type=int, default=2, help="Number of executions to compare")
    scan_parser.set_defaults(func=cmd_scan)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
