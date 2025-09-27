from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional

from .utils import load_json


@dataclass
class TransformLevel:
  label: str
  settings: Dict[str, object]


@dataclass
class TransformSpec:
  name: str
  levels: List[TransformLevel]


@dataclass
class DetectorSpec:
  type: str
  threshold: float
  options: Dict[str, object] = field(default_factory=dict)


@dataclass
class HardeningToggle:
  name: str
  watermark: Optional[DetectorSpec] = None
  c2pa: Optional[DetectorSpec] = None


@dataclass
class PipelineConfig:
  dataset_path: Path
  output_dir: Path
  transforms: List[TransformSpec]
  watermark_detector: DetectorSpec
  c2pa_detector: DetectorSpec
  hardening: List[HardeningToggle]


def _parse_detector(payload: dict) -> DetectorSpec:
  return DetectorSpec(
      type=payload["type"],
      threshold=float(payload.get("threshold", 0.5)),
      options=payload.get("options", {}),
  )


def load_config(path: Path) -> PipelineConfig:
  payload = load_json(path)
  transforms: List[TransformSpec] = []
  for transform_payload in payload.get("transforms", []):
    levels = [
        TransformLevel(
            label=str(level.get("label") or f"level-{index}"),
            settings=level.get("settings", {}),
        )
        for index, level in enumerate(transform_payload.get("levels", []))
    ]
    transforms.append(TransformSpec(name=transform_payload["name"], levels=levels))

  hardening: List[HardeningToggle] = []
  for toggle_payload in payload.get("hardening", []):
    watermark_spec = toggle_payload.get("watermark")
    c2pa_spec = toggle_payload.get("c2pa")
    hardening.append(
        HardeningToggle(
            name=toggle_payload["name"],
            watermark=_parse_detector(watermark_spec) if watermark_spec else None,
            c2pa=_parse_detector(c2pa_spec) if c2pa_spec else None,
        )
    )

  output_dir = payload.get("output_dir")
  config = PipelineConfig(
      dataset_path=(path.parent / payload["dataset"]).resolve(),
      output_dir=(path.parent / output_dir).resolve() if output_dir else (path.parent / "out").resolve(),
      transforms=transforms,
      watermark_detector=_parse_detector(payload["watermark_detector"]),
      c2pa_detector=_parse_detector(payload["c2pa_detector"]),
      hardening=hardening,
  )
  return config
