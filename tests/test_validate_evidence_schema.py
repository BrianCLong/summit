from __future__ import annotations

import json
from pathlib import Path

import pytest

from scripts.ci.validate_evidence_schema import run_cli


def _write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload), encoding="utf-8")


def test_validate_evidence_schema_passes(tmp_path: Path) -> None:
    schema_dir = Path("schemas/evidence")
    report = tmp_path / "report.json"
    metrics = tmp_path / "metrics.json"
    stamp = tmp_path / "stamp.json"

    _write_json(
        report,
        {
            "evidence_id": "EVD-TEST-001",
            "summary": "ok",
            "artifacts": [],
        },
    )
    _write_json(metrics, {"metrics": {}})
    _write_json(stamp, {"created_at": "2026-02-01T00:00:00Z"})

    index = {
        "version": "1.0",
        "items": [
            {
                "evidence_id": "EVD-TEST-001",
                "files": {
                    "report": str(report),
                    "metrics": str(metrics),
                    "stamp": str(stamp),
                },
            }
        ],
    }

    index_path = tmp_path / "index.json"
    _write_json(index_path, index)

    assert run_cli(["--schema-dir", str(schema_dir), "--index-path", str(index_path)]) == 0


def test_validate_evidence_schema_rejects_timestamps(tmp_path: Path) -> None:
    schema_dir = Path("schemas/evidence")
    report = tmp_path / "report.json"
    metrics = tmp_path / "metrics.json"
    stamp = tmp_path / "stamp.json"

    _write_json(
        report,
        {
            "evidence_id": "EVD-TEST-002",
            "summary": "bad",
            "artifacts": [],
            "created_at": "2026-02-01T00:00:00Z",
        },
    )
    _write_json(metrics, {"metrics": {}})
    _write_json(stamp, {"created_at": "2026-02-01T00:00:00Z"})

    index = {
        "version": "1.0",
        "items": [
            {
                "evidence_id": "EVD-TEST-002",
                "files": {
                    "report": str(report),
                    "metrics": str(metrics),
                    "stamp": str(stamp),
                },
            }
        ],
    }

    index_path = tmp_path / "index.json"
    _write_json(index_path, index)

    with pytest.raises(SystemExit):
        run_cli(["--schema-dir", str(schema_dir), "--index-path", str(index_path)])
