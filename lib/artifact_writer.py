#!/usr/bin/env python3
"""Deterministic writer for tooling-agent artifacts."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

TIMESTAMP_KEYS = {
    "timestamp",
    "generated_at",
    "started_at",
    "finished_at",
    "created_at",
    "updated_at",
    "ts",
}


def _assert_no_timestamps(value: Any) -> None:
    if isinstance(value, dict):
        for key, nested in value.items():
            if key in TIMESTAMP_KEYS:
                raise ValueError(f"timestamp key '{key}' is only allowed in stamp artifacts")
            _assert_no_timestamps(nested)
    elif isinstance(value, list):
        for item in value:
            _assert_no_timestamps(item)


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"{json.dumps(payload, sort_keys=True, indent=2)}\n", encoding="utf-8")


def write_tooling_artifacts(output_dir: Path, report: dict[str, Any], metrics: dict[str, Any], stamp: dict[str, Any]) -> None:
    _assert_no_timestamps(report)
    _assert_no_timestamps(metrics)

    write_json(output_dir / "report.json", report)
    write_json(output_dir / "metrics.json", metrics)
    write_json(output_dir / "stamp.json", stamp)
