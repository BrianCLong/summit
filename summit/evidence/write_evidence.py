from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Mapping


def canonical_json_dumps(payload: Mapping[str, Any]) -> str:
    return json.dumps(
        payload,
        sort_keys=True,
        indent=2,
        ensure_ascii=False,
    ) + "\n"


def write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(canonical_json_dumps(payload), encoding="utf-8")


def write_evidence_bundle(
    output_dir: Path,
    *,
    report: Mapping[str, Any],
    metrics: Mapping[str, Any],
    stamp: Mapping[str, Any],
    index: Mapping[str, Any],
) -> dict[str, Path]:
    output_dir.mkdir(parents=True, exist_ok=True)

    report_path = output_dir / "report.json"
    metrics_path = output_dir / "metrics.json"
    stamp_path = output_dir / "stamp.json"
    index_path = output_dir / "evidence" / "index.json"

    write_json(report_path, report)
    write_json(metrics_path, metrics)
    write_json(stamp_path, stamp)
    write_json(index_path, index)

    return {
        "report": report_path,
        "metrics": metrics_path,
        "stamp": stamp_path,
        "index": index_path,
    }
