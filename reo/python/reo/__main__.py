"""Command line entry point for REO."""

from __future__ import annotations

import argparse
import importlib.util
import json
from pathlib import Path
from typing import Any

from .artifacts import export_json_artifact, export_junit_artifact
from .comparison import ComparisonReport
from .config import SuiteConfig
from .suite import EvaluationResult, EvaluationSuite


def load_model_adapter(module_path: str):
  path = Path(module_path)
  if not path.exists():
    raise FileNotFoundError(f"Model module not found: {module_path}")
  spec = importlib.util.spec_from_file_location("reo_model", path)
  if spec is None or spec.loader is None:
    raise ImportError(f"Unable to load model module from {module_path}")
  module = importlib.util.module_from_spec(spec)
  spec.loader.exec_module(module)  # type: ignore[attr-defined]
  if hasattr(module, "build_model"):
    return module.build_model()
  raise AttributeError("Model module must expose a 'build_model()' factory.")


def load_baseline(path: Path, config: SuiteConfig) -> EvaluationResult:
  with open(path, "r", encoding="utf-8") as handle:
    payload = json.load(handle)
  return EvaluationResult.from_dict(config, payload)


def cli(argv: list[str] | None = None) -> int:
  parser = argparse.ArgumentParser(description="Responsible Evaluation Orchestrator")
  parser.add_argument("suite", type=Path, help="Path to suite YAML configuration")
  parser.add_argument("--model", required=True, help="Path to Python module with build_model()")
  parser.add_argument("--json-out", type=Path, help="Path to write JSON artifact")
  parser.add_argument("--junit-out", type=Path, help="Path to write JUnit artifact")
  parser.add_argument("--baseline", type=Path, help="Existing JSON artifact for baseline run")
  parser.add_argument("--baseline-version", default="baseline")
  parser.add_argument("--candidate-version", default="candidate")
  parser.add_argument("--dashboard-json", type=Path, help="Path to write dashboard comparison data")
  args = parser.parse_args(argv)

  config = SuiteConfig.from_yaml(args.suite)
  suite = EvaluationSuite(config)
  model = load_model_adapter(args.model)
  result = suite.run(model)
  if args.json_out:
    export_json_artifact(result, args.json_out)
  if args.junit_out:
    export_junit_artifact(result, args.junit_out)

  if args.baseline:
    baseline_result = load_baseline(args.baseline, config)
    report = ComparisonReport.from_results(
        baseline=baseline_result,
        candidate=result,
        baseline_version=args.baseline_version,
        candidate_version=args.candidate_version,
    )
    if args.dashboard_json:
      payload: dict[str, Any] = {
          "baseline_version": report.baseline_version,
          "candidate_version": report.candidate_version,
          "overall_delta": report.overall_delta,
          "task_deltas": [
              {
                  "task_id": task.task_id,
                  "score_delta": task.score_delta,
                  "metrics": [
                      {
                          "metric": metric.metric,
                          "goal": metric.goal,
                          "delta": metric.delta,
                          "stderr": metric.stderr,
                          "ci": [metric.ci_low, metric.ci_high],
                          "is_regression": metric.is_regression,
                      }
                      for metric in task.metric_deltas
                  ],
              }
              for task in report.task_deltas
          ],
          "regressions": {
              task_id: [
                  {
                      "metric": metric.metric,
                      "delta": metric.delta,
                      "ci": [metric.ci_low, metric.ci_high],
                  }
                  for metric in metrics
              ]
              for task_id, metrics in report.regressions().items()
          },
      }
      args.dashboard_json.parent.mkdir(parents=True, exist_ok=True)
      args.dashboard_json.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(
        f"Overall delta ({report.candidate_version} - {report.baseline_version}): "
        f"{report.overall_delta:.4f}"
    )
    for task in report.task_deltas:
      print(f"  Task {task.task_id}: delta={task.score_delta:.4f}")
      for metric in task.metric_deltas:
        status = "REGRESSION" if metric.is_regression else "stable"
        print(
            "    Metric {metric} delta={delta:.4f} ci=[{low:.4f},{high:.4f}] {status}".format(
                metric=metric.metric,
                delta=metric.delta,
                low=metric.ci_low,
                high=metric.ci_high,
                status=status,
            )
        )
  else:
    if args.dashboard_json:
      raise ValueError("Dashboard output requires --baseline for comparison")
  return 0


if __name__ == "__main__":
  raise SystemExit(cli())
