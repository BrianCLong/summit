from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict

from .dataset import ContentItem
from .transforms import TransformResult
from .utils import normalize_whitespace, stable_hash_bytes


@dataclass
class DetectorResult:
  score: float
  threshold: float
  passed: bool
  context: Dict[str, object]


class Detector:
  def __init__(self, threshold: float, options: Dict[str, object]):
    self.threshold = threshold
    self.options = options

  def score(self, item: ContentItem, artifact: TransformResult) -> DetectorResult:
    raise NotImplementedError


class KeywordWatermarkDetector(Detector):
  def __init__(self, threshold: float, options: Dict[str, object]):
    super().__init__(threshold, options)
    keywords = options.get("keywords") or ["watermark", "gw", "origin"]
    self.keywords = [kw.lower() for kw in keywords]
    self.tolerance = float(options.get("severity_tolerance", 0.25))

  def score(self, item: ContentItem, artifact: TransformResult) -> DetectorResult:
    text = normalize_whitespace(artifact.content or item.load_text()).lower()
    hits = sum(1 for keyword in self.keywords if keyword in text)
    base_score = hits / max(1, len(self.keywords))
    severity = artifact.severity
    adjusted = max(0.0, base_score - max(0.0, severity - self.tolerance))
    return DetectorResult(
        score=round(adjusted, 4),
        threshold=self.threshold,
        passed=adjusted >= self.threshold,
        context={"hits": hits, "severity": severity},
    )


class ManifestClaimDetector(Detector):
  def __init__(self, threshold: float, options: Dict[str, object]):
    super().__init__(threshold, options)
    self.noise_penalty = float(options.get("noise_penalty", 0.35))

  def score(self, item: ContentItem, artifact: TransformResult) -> DetectorResult:
    manifest_rel = item.metadata.get("c2pa_manifest")
    manifest_path = (item.root / manifest_rel) if manifest_rel else None
    exists = manifest_path and Path(manifest_path).exists()
    severity = artifact.severity
    if exists:
      payload = (manifest_path or Path()).read_bytes()
      stability = 1.0 - stable_hash_bytes(payload, "manifest") * 0.2
      score = max(0.0, stability - severity * self.noise_penalty)
    else:
      score = 0.05
    return DetectorResult(
        score=round(score, 4),
        threshold=self.threshold,
        passed=score >= self.threshold,
        context={"manifest": str(manifest_path) if exists else None, "severity": severity},
    )


DETECTOR_REGISTRY = {
    "keywords": KeywordWatermarkDetector,
    "manifest": ManifestClaimDetector,
}


def build_detector(kind: str, threshold: float, options: Dict[str, object]) -> Detector:
  if kind not in DETECTOR_REGISTRY:
    raise KeyError(f"Unknown detector type: {kind}")
  detector_cls = DETECTOR_REGISTRY[kind]
  return detector_cls(threshold=threshold, options=options)
