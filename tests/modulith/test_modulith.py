from __future__ import annotations

import json
from pathlib import Path

from summit.modulith.runner import run


def _write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def _load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def test_disallowed_import_fails_with_evidence_id(tmp_path: Path, monkeypatch) -> None:
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
  cross_module_requires_event: true
""",
    )
    _write(tmp_path / "summit/core/events.py", "class CoreEvent: ...\n")
    _write(tmp_path / "summit/ingest/worker.py", "import summit.core.service\n")

    monkeypatch.setenv("ENABLE_MODULITH", "true")
    exit_code = run(source_root=tmp_path)

    assert exit_code == 1
    report = _load_json(tmp_path / "artifacts/modulith/report.json")
    assert report["violations"][0]["code"] == "MBV-IMP-001"
    assert report["violations"][0]["evidence_id"] == "MBV-IMP-001"


def test_allowed_import_passes(tmp_path: Path, monkeypatch) -> None:
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
  cross_module_requires_event: true
""",
    )
    _write(tmp_path / "summit/core/events.py", "class CoreEvent: ...\n")
    _write(tmp_path / "summit/ingest/worker.py", "import summit.core.events\n")

    monkeypatch.setenv("ENABLE_MODULITH", "true")
    exit_code = run(source_root=tmp_path)

    assert exit_code == 0
    report = _load_json(tmp_path / "artifacts/modulith/report.json")
    assert report["status"] == "pass"


def test_artifacts_are_deterministic(tmp_path: Path, monkeypatch) -> None:
    _write(
        tmp_path / "config/modules.yaml",
        """
modules:
  core:
    path: summit/core
    allowed_dependencies: []
""",
    )
    _write(tmp_path / "summit/core/a.py", "VALUE = 1\n")

    monkeypatch.setenv("ENABLE_MODULITH", "true")
    first = run(source_root=tmp_path)
    snapshot = {
        name: (tmp_path / f"artifacts/modulith/{name}").read_text(encoding="utf-8")
        for name in ("report.json", "metrics.json", "stamp.json")
    }
    second = run(source_root=tmp_path)

    assert first == 0
    assert second == 0
    for name, content in snapshot.items():
        assert (tmp_path / f"artifacts/modulith/{name}").read_text(encoding="utf-8") == content
