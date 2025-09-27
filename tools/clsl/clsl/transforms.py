from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict

from .dataset import ContentItem
from .utils import ensure_dir, normalize_whitespace, stable_hash_bytes


@dataclass
class TransformResult:
  path: Path
  content: str
  severity: float
  metadata: Dict[str, object]


class BaseTransform:
  name = "base"

  def apply(self, item: ContentItem, output_dir: Path, settings: Dict[str, object]) -> TransformResult:
    raise NotImplementedError


class TranscodeTransform(BaseTransform):
  name = "transcode"

  def apply(self, item: ContentItem, output_dir: Path, settings: Dict[str, object]) -> TransformResult:
    ensure_dir(output_dir)
    text = item.load_text()
    normalized = normalize_whitespace(text)
    path = output_dir / f"{item.identifier}.transcoded.txt"
    path.write_text(normalized, encoding="utf-8")
    severity = 0.1 if normalized != text else 0.0
    return TransformResult(path=path, content=normalized, severity=severity, metadata={})


class CropTransform(BaseTransform):
  name = "crop"

  def apply(self, item: ContentItem, output_dir: Path, settings: Dict[str, object]) -> TransformResult:
    ensure_dir(output_dir)
    keep_fraction = float(settings.get("keep_fraction", 0.7))
    keep_fraction = max(0.1, min(1.0, keep_fraction))
    text = item.load_text()
    tokens = text.split()
    keep = max(1, int(len(tokens) * keep_fraction))
    cropped = " ".join(tokens[:keep])
    path = output_dir / f"{item.identifier}.cropped.txt"
    path.write_text(cropped, encoding="utf-8")
    severity = 1.0 - (keep / len(tokens)) if tokens else 0.0
    metadata = {"keep_fraction": keep_fraction, "dropped": max(0, len(tokens) - keep)}
    return TransformResult(path=path, content=cropped, severity=round(max(0.0, severity), 3), metadata=metadata)


class ParaphraseTransform(BaseTransform):
  name = "paraphrase"
  SYNONYMS = {
      "robust": "resilient",
      "watermark": "signature",
      "provenance": "origin",
      "detection": "analysis",
      "content": "material",
  }

  def apply(self, item: ContentItem, output_dir: Path, settings: Dict[str, object]) -> TransformResult:
    ensure_dir(output_dir)
    text = item.load_text()
    tokens = text.split()
    replaced = 0
    transformed = []
    for token in tokens:
      bare = token.strip(".,!?\"'").lower()
      replacement = self.SYNONYMS.get(bare)
      if replacement:
        replaced += 1
        transformed.append(token.replace(bare, replacement))
      else:
        transformed.append(token)
    new_text = " ".join(transformed)
    path = output_dir / f"{item.identifier}.paraphrased.txt"
    path.write_text(new_text, encoding="utf-8")
    severity = replaced / len(tokens) if tokens else 0.0
    return TransformResult(path=path, content=new_text, severity=round(severity, 3), metadata={"replaced": replaced})


class OCRPivotTransform(BaseTransform):
  name = "ocr_pivot"

  def apply(self, item: ContentItem, output_dir: Path, settings: Dict[str, object]) -> TransformResult:
    ensure_dir(output_dir)
    mode = settings.get("mode", "ocr").lower()
    text = item.load_text()

    if mode == "ocr":
      lines = text.splitlines() or [text]
      converted = [f"line-{index}:{stable_hash_bytes(line.encode('utf-8'), 'ocr'):.6f}" for index, line in enumerate(lines)]
      payload = "\n".join(converted)
      suffix = "ocr"
      severity = 0.4
    else:
      converted = [f"{word}[{len(word)}]" for word in text.split()]
      payload = " ".join(converted)
      suffix = "rendered"
      severity = 0.5

    path = output_dir / f"{item.identifier}.{suffix}.txt"
    path.write_text(payload, encoding="utf-8")
    return TransformResult(path=path, content=payload, severity=severity, metadata={"mode": mode})


class RescanTransform(BaseTransform):
  name = "rescan"

  def apply(self, item: ContentItem, output_dir: Path, settings: Dict[str, object]) -> TransformResult:
    ensure_dir(output_dir)
    intensity = float(settings.get("intensity", 0.5))
    intensity = max(0.0, min(1.0, intensity))
    text = item.load_text()
    tokens = text.split()
    mutated = []
    for index, token in enumerate(tokens):
      jitter = stable_hash_bytes(f"{token}-{index}".encode("utf-8"), "rescan")
      mutated.append(f"{token}<{jitter:.2f}>")
    payload = " ".join(mutated)
    path = output_dir / f"{item.identifier}.rescanned.txt"
    path.write_text(payload, encoding="utf-8")
    return TransformResult(path=path, content=payload, severity=intensity, metadata={"intensity": intensity})


TRANSFORMS = {
    TranscodeTransform.name: TranscodeTransform(),
    CropTransform.name: CropTransform(),
    ParaphraseTransform.name: ParaphraseTransform(),
    OCRPivotTransform.name: OCRPivotTransform(),
    RescanTransform.name: RescanTransform(),
}


def get_transform(name: str) -> BaseTransform:
  if name not in TRANSFORMS:
    raise KeyError(f"Unknown transform: {name}")
  return TRANSFORMS[name]
