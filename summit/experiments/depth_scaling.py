from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable


@dataclass(frozen=True)
class DepthScalingConfig:
    depths: tuple[int, ...] = (64, 128, 256)
    seed: int = 0
    item_slug: str = "260119895-keel"
    evidence_id: str = "EVD-260119895-keel-DSCL-003"


def _hash_config(config: DepthScalingConfig) -> str:
    payload = json.dumps(asdict(config), sort_keys=True).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def run_depth_sweep(
    *,
    config: DepthScalingConfig,
    out_dir: str | Path = "runs/depth_scaling",
) -> dict:
    out_path = Path(out_dir)
    out_path.mkdir(parents=True, exist_ok=True)
    config_hash = _hash_config(config)
    results: list[dict] = []
    for depth in config.depths:
        results.append({"layers": depth, "status": "todo"})
    payload = {
        "evidence_id": config.evidence_id,
        "item_slug": config.item_slug,
        "config_hash": config_hash,
        "results": results,
    }
    (out_path / "metrics.json").write_text(
        json.dumps(payload, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return payload


def parse_depths(depths: Iterable[int]) -> tuple[int, ...]:
    return tuple(int(d) for d in depths)
