from __future__ import annotations

from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, List, Sequence

from .config import DetectorSpec, PipelineConfig
from .dataset import ContentItem, Dataset, load_dataset
from .detectors import Detector, build_detector
from .transforms import TransformResult, get_transform
from .utils import RocPoint, auc, dump_json, ensure_dir, roc_curve, write_csv


@dataclass
class ArtifactRecord:
  item_id: str
  run: str
  transform: str
  level: str
  severity: float
  watermark_score: float
  watermark_passed: bool
  c2pa_score: float
  c2pa_passed: bool
  ground_truth_watermark: bool
  ground_truth_c2pa: bool
  metadata: Dict[str, object]


@dataclass
class EvaluationRun:
  name: str
  thresholds: Dict[str, float]
  artifacts: List[ArtifactRecord]
  roc: Dict[str, List[RocPoint]]
  auc: Dict[str, float]
  breakpoints: Dict[str, Dict[str, float]]


class EvaluationRunner:
  def __init__(self, config: PipelineConfig):
    self.config = config
    self.dataset: Dataset = load_dataset(config.dataset_path)

  def run(self) -> List[EvaluationRun]:
    runs: List[EvaluationRun] = []
    baseline = self._evaluate_run("baseline", self.config.watermark_detector, self.config.c2pa_detector)
    runs.append(baseline)
    for toggle in self.config.hardening:
      watermark = toggle.watermark or self.config.watermark_detector
      c2pa = toggle.c2pa or self.config.c2pa_detector
      runs.append(self._evaluate_run(toggle.name, watermark, c2pa))
    return runs

  def _evaluate_run(self, name: str, watermark_spec: DetectorSpec, c2pa_spec: DetectorSpec) -> EvaluationRun:
    output_dir = self.config.output_dir / name
    ensure_dir(output_dir)
    detectors = self._build_detectors(watermark_spec, c2pa_spec)
    artifacts: List[ArtifactRecord] = []

    for item in self.dataset:
      baseline_artifact = TransformResult(
          path=item.path,
          content=item.load_text(),
          severity=0.0,
          metadata={"transform": "baseline"},
      )
      artifacts.append(
          self._score_artifact(
              run=name,
              item=item,
              transform="baseline",
              level="baseline",
              artifact=baseline_artifact,
              detectors=detectors,
          )
      )

      for transform_spec in self.config.transforms:
        transform = get_transform(transform_spec.name)
        for level in transform_spec.levels:
          level_dir = output_dir / item.identifier / transform.name / level.label
          ensure_dir(level_dir)
          result = transform.apply(item, level_dir, level.settings)
          artifacts.append(
              self._score_artifact(
                  run=name,
                  item=item,
                  transform=transform.name,
                  level=level.label,
                  artifact=result,
                  detectors=detectors,
              )
          )

    roc_data = self._build_roc(artifacts)
    auc_data = {key: auc(points) for key, points in roc_data.items()}
    breakpoint_data = self._compute_breakpoints(artifacts, detectors)

    return EvaluationRun(
        name=name,
        thresholds={"watermark": watermark_spec.threshold, "c2pa": c2pa_spec.threshold},
        artifacts=artifacts,
        roc=roc_data,
        auc=auc_data,
        breakpoints=breakpoint_data,
    )

  def _build_detectors(self, watermark: DetectorSpec, c2pa: DetectorSpec) -> Dict[str, Detector]:
    return {
        "watermark": build_detector(watermark.type, watermark.threshold, watermark.options),
        "c2pa": build_detector(c2pa.type, c2pa.threshold, c2pa.options),
    }

  def _score_artifact(
      self,
      run: str,
      item: ContentItem,
      transform: str,
      level: str,
      artifact: TransformResult,
      detectors: Dict[str, Detector],
  ) -> ArtifactRecord:
    watermark_result = detectors["watermark"].score(item, artifact)
    c2pa_result = detectors["c2pa"].score(item, artifact)
    metadata = {**artifact.metadata, "path": str(artifact.path)}
    return ArtifactRecord(
        item_id=item.identifier,
        run=run,
        transform=transform,
        level=level,
        severity=artifact.severity,
        watermark_score=watermark_result.score,
        watermark_passed=watermark_result.passed,
        c2pa_score=c2pa_result.score,
        c2pa_passed=c2pa_result.passed,
        ground_truth_watermark=item.ground_truth.get("watermark", False),
        ground_truth_c2pa=item.ground_truth.get("c2pa", False),
        metadata=metadata,
    )

  def _build_roc(self, artifacts: Sequence[ArtifactRecord]) -> Dict[str, List[RocPoint]]:
    watermark_samples = [(record.watermark_score, int(record.ground_truth_watermark)) for record in artifacts]
    c2pa_samples = [(record.c2pa_score, int(record.ground_truth_c2pa)) for record in artifacts]
    return {
        "watermark": roc_curve(watermark_samples),
        "c2pa": roc_curve(c2pa_samples),
    }

  def _compute_breakpoints(self, artifacts: Sequence[ArtifactRecord], detectors: Dict[str, Detector]) -> Dict[str, Dict[str, float]]:
    results: Dict[str, Dict[str, float]] = {"watermark": {}, "c2pa": {}}
    for detection in ("watermark", "c2pa"):
      threshold = detectors[detection].threshold
      grouped: Dict[str, List[ArtifactRecord]] = {}
      for record in artifacts:
        if record.transform == "baseline":
          continue
        key = f"{record.transform}:{record.level}"
        grouped.setdefault(key, []).append(record)

      for key, records in grouped.items():
        positives = [r for r in records if getattr(r, f"ground_truth_{detection}")]
        if not positives:
          results[detection][key] = 1.0
          continue
        passes = [r for r in positives if getattr(r, f"{detection}_score") >= threshold]
        survival = len(passes) / len(positives)
        results[detection][key] = round(survival, 3)
    return results


def export_reports(runs: Sequence[EvaluationRun], output_dir: Path) -> Dict[str, Path]:
  ensure_dir(output_dir)
  paths: Dict[str, Path] = {}

  for run in runs:
    run_dir = output_dir / f"results_{run.name}.json"
    artifacts_payload = [asdict(artifact) for artifact in run.artifacts]
    dump_json(run_dir, artifacts_payload)
    paths[f"results_{run.name}"] = run_dir

  rows: List[dict] = []
  for run in runs:
    for artifact in run.artifacts:
      rows.append({
          "run": run.name,
          "item_id": artifact.item_id,
          "transform": artifact.transform,
          "level": artifact.level,
          "severity": artifact.severity,
          "watermark_score": artifact.watermark_score,
          "watermark_passed": artifact.watermark_passed,
          "c2pa_score": artifact.c2pa_score,
          "c2pa_passed": artifact.c2pa_passed,
      })
  csv_path = output_dir / "results.csv"
  write_csv(csv_path, rows)
  paths["results_csv"] = csv_path

  for run in runs:
    roc_payload = {
        key: [asdict(point) for point in points]
        for key, points in run.roc.items()
    }
    roc_path = output_dir / f"roc_{run.name}.json"
    dump_json(roc_path, roc_payload)
    paths[f"roc_{run.name}"] = roc_path

  return paths
