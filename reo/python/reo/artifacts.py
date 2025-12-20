"""Artifact exporters for REO results."""

from __future__ import annotations

from pathlib import Path
from xml.etree.ElementTree import Element, SubElement, tostring

from .suite import EvaluationResult


def export_json_artifact(result: EvaluationResult, path: Path | str) -> None:
  destination = Path(path)
  result.to_json(destination)


def export_junit_artifact(result: EvaluationResult, path: Path | str) -> None:
  destination = Path(path)
  destination.parent.mkdir(parents=True, exist_ok=True)
  suite_elem = Element("testsuite", attrib={
      "name": result.suite.name,
      "tests": str(len(result.task_results)),
  })
  for task in result.task_results:
    case = SubElement(suite_elem, "testcase", attrib={
        "classname": result.suite.name,
        "name": task.task.id,
        "time": "0",
    })
    rollup = f"score={task.score:.4f}; weight={task.normalized_weight:.4f}"
    SubElement(case, "system-out").text = rollup
    for metric_name, metric in task.metrics.items():
      ci_low, ci_high = metric.confidence_interval()
      detail = (
          f"metric={metric_name} value={metric.value:.4f} n={metric.sample_size} "
          f"stderr={metric.stderr:.4f} ci=[{ci_low:.4f},{ci_high:.4f}]"
      )
      SubElement(case, "system-err").text = detail
  xml_bytes = tostring(suite_elem, encoding="utf-8")
  destination.write_bytes(xml_bytes)
