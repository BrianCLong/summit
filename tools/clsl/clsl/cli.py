from __future__ import annotations

import argparse
from pathlib import Path
from typing import Sequence

from .config import load_config
from .evaluator import EvaluationRunner, export_reports
from .reporting import export_summary
from .utils import ensure_dir


def run_pipeline(config_path: Path, output_dir: Path | None = None) -> Sequence[Path]:
  config = load_config(config_path)
  if output_dir:
    config.output_dir = output_dir
  ensure_dir(config.output_dir)

  runner = EvaluationRunner(config)
  runs = runner.run()
  artifacts = export_reports(runs, config.output_dir)
  summary_path = export_summary(runs, config.output_dir / "summary.json")
  return [summary_path, *artifacts.values()]


def execute(argv: Sequence[str] | None = None) -> int:
  parser = argparse.ArgumentParser(description="Content Laundering Stress Lab")
  subparsers = parser.add_subparsers(dest="command")

  run_parser = subparsers.add_parser("run", help="Execute an evaluation pipeline")
  run_parser.add_argument("--config", required=True, type=Path)
  run_parser.add_argument("--output", type=Path, default=None)

  args = parser.parse_args(argv)
  if args.command != "run":
    parser.print_help()
    return 1

  run_pipeline(args.config, args.output)
  return 0


if __name__ == "__main__":  # pragma: no cover
  raise SystemExit(execute())
