"""Command line interface for the PPEG tool."""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Callable, Iterable

from .codegen import PipelineGenerator
from .diff_inspector import diff_provenance, render_diff_report
from .spec import SpecLoader


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="ppeg", description="Provenance-preserving ETL generator")
    subparsers = parser.add_subparsers(dest="command", required=True)

    generate_parser = subparsers.add_parser("generate", help="Generate a pipeline from a YAML spec")
    generate_parser.add_argument("spec", type=Path, help="Path to the YAML specification")
    generate_parser.add_argument(
        "--out-dir",
        type=Path,
        default=Path("generated"),
        help="Directory to place generated artifacts",
    )
    generate_parser.set_defaults(func=_cmd_generate)

    diff_parser = subparsers.add_parser("diff", help="Compare provenance logs from two runs")
    diff_parser.add_argument("before", type=Path, help="Path to the baseline provenance JSON")
    diff_parser.add_argument("after", type=Path, help="Path to the new provenance JSON")
    diff_parser.set_defaults(func=_cmd_diff)

    return parser


def _cmd_generate(args: argparse.Namespace) -> int:
    loader = SpecLoader()
    spec = loader.load(args.spec)
    generator = PipelineGenerator(spec)
    generator.generate(args.out_dir)
    return 0


def _cmd_diff(args: argparse.Namespace) -> int:
    diffs = diff_provenance(args.before, args.after)
    print(render_diff_report(diffs))
    return 0


def main(argv: Iterable[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(list(argv) if argv is not None else None)
    func: Callable[[argparse.Namespace], int] = getattr(args, "func")
    return func(args)


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(main())
