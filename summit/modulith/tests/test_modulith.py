from __future__ import annotations

import json
from pathlib import Path

from summit.modulith.main import run


def _write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def _load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def test_disallowed_import_fails_with_evidence_id(monkeypatch, tmp_path: Path) -> None:
    _write(
        tmp_path / "config/modules.yaml",
        """
modules:
  core:
    path: summit/core
    allowed_dependencies: []
  ingest:
    path: summit/ingest
    allowed_dependencies: []
rules:
  cross_module_requires_event: false
""".strip()
        + "\n",
    )
    _write(tmp_path / "summit/core/events.py", "class CoreEvent: ...\n")
    _write(tmp_path / "summit/ingest/worker.py", "from summit.core.events import CoreEvent\n")

    monkeypatch.setenv("ENABLE_MODULITH", "true")
    exit_code = run(
        [
            "--repo-root",
            str(tmp_path),
            "--config",
            str(tmp_path / "config/modules.yaml"),
            "--out-dir",
            str(tmp_path / "artifacts/modulith"),
        ]
    )

    assert exit_code == 1
    report = _load_json(tmp_path / "artifacts/modulith/report.json")
    assert report["violations"][0]["evidence_id"] == "MBV-IMP-001"


def test_allowed_import_passes(monkeypatch, tmp_path: Path) -> None:
    _write(
        tmp_path / "config/modules.yaml",
        """
modules:
  core:
    path: summit/core
    allowed_dependencies: []
  ingest:
    path: summit/ingest
    allowed_dependencies: [core]
rules:
  cross_module_requires_event: false
""".strip()
        + "\n",
    )
    _write(tmp_path / "summit/core/events.py", "class CoreEvent: ...\n")
    _write(tmp_path / "summit/ingest/worker.py", "from summit.core.events import CoreEvent\n")

    monkeypatch.setenv("ENABLE_MODULITH", "1")
    exit_code = run(
        [
            "--repo-root",
            str(tmp_path),
            "--config",
            str(tmp_path / "config/modules.yaml"),
            "--out-dir",
            str(tmp_path / "artifacts/modulith"),
        ]
    )

    assert exit_code == 0
    report = _load_json(tmp_path / "artifacts/modulith/report.json")
    assert report["status"] == "pass"


def test_deterministic_outputs(monkeypatch, tmp_path: Path) -> None:
    _write(
        tmp_path / "config/modules.yaml",
        """
modules:
  core:
    path: summit/core
    allowed_dependencies: []
rules:
  cross_module_requires_event: false
""".strip()
        + "\n",
    )
    _write(tmp_path / "summit/core/events.py", "class CoreEvent: ...\n")

    monkeypatch.setenv("ENABLE_MODULITH", "true")
    args = [
        "--repo-root",
        str(tmp_path),
        "--config",
        str(tmp_path / "config/modules.yaml"),
        "--out-dir",
        str(tmp_path / "artifacts/modulith"),
    ]
    assert run(args) == 0
    first_report = (tmp_path / "artifacts/modulith/report.json").read_text(encoding="utf-8")
    first_metrics = (tmp_path / "artifacts/modulith/metrics.json").read_text(encoding="utf-8")
    first_stamp = (tmp_path / "artifacts/modulith/stamp.json").read_text(encoding="utf-8")

    assert run(args) == 0

    assert (tmp_path / "artifacts/modulith/report.json").read_text(encoding="utf-8") == first_report
    assert (tmp_path / "artifacts/modulith/metrics.json").read_text(encoding="utf-8") == first_metrics
    assert (tmp_path / "artifacts/modulith/stamp.json").read_text(encoding="utf-8") == first_stamp
