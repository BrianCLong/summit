from __future__ import annotations

import json
from pathlib import Path

from summit.modulith.main import run



def _write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")



def _base_config(root: Path, allow_ingest: list[str]) -> Path:
    config_path = root / "config" / "modules.yaml"
    _write(
        config_path,
        "\n".join(
            [
                "modules:",
                "  core:",
                "    path: summit/core",
                "    allowed_dependencies: []",
                "  ingest:",
                "    path: summit/ingest",
                f"    allowed_dependencies: [{', '.join(allow_ingest)}]",
                "rules:",
                "  cross_module_requires_event: false",
            ]
        )
        + "\n",
    )
    return config_path



def test_disallowed_import_fails_with_evidence_id(monkeypatch, tmp_path: Path) -> None:
    _base_config(tmp_path, allow_ingest=[])
    _write(tmp_path / "summit" / "core" / "events.py", "EVENT = 'ok'\n")
    _write(tmp_path / "summit" / "ingest" / "worker.py", "import summit.core.events\n")

    monkeypatch.setenv("ENABLE_MODULITH", "true")
    exit_code = run(["--repo-root", str(tmp_path)])

    assert exit_code == 1
    report = json.loads((tmp_path / "artifacts" / "modulith" / "report.json").read_text(encoding="utf-8"))
    assert report["status"] == "fail"
    assert report["violations"][0]["rule_id"] == "MBV-IMP-001"



def test_allowed_import_passes(monkeypatch, tmp_path: Path) -> None:
    _base_config(tmp_path, allow_ingest=["core"])
    _write(tmp_path / "summit" / "core" / "events.py", "EVENT = 'ok'\n")
    _write(tmp_path / "summit" / "ingest" / "worker.py", "import summit.core.events\n")

    monkeypatch.setenv("ENABLE_MODULITH", "true")
    exit_code = run(["--repo-root", str(tmp_path)])

    assert exit_code == 0
    report = json.loads((tmp_path / "artifacts" / "modulith" / "report.json").read_text(encoding="utf-8"))
    assert report["status"] == "pass"
    assert report["violations"] == []



def test_artifacts_are_deterministic(monkeypatch, tmp_path: Path) -> None:
    _base_config(tmp_path, allow_ingest=["core"])
    _write(tmp_path / "summit" / "core" / "events.py", "EVENT = 'ok'\n")
    _write(tmp_path / "summit" / "ingest" / "worker.py", "import summit.core.events\n")

    monkeypatch.setenv("ENABLE_MODULITH", "true")
    first = run(["--repo-root", str(tmp_path)])
    first_bundle = {
        name: (tmp_path / "artifacts" / "modulith" / name).read_text(encoding="utf-8")
        for name in ["report.json", "metrics.json", "stamp.json"]
    }

    second = run(["--repo-root", str(tmp_path)])
    second_bundle = {
        name: (tmp_path / "artifacts" / "modulith" / name).read_text(encoding="utf-8")
        for name in ["report.json", "metrics.json", "stamp.json"]
    }

    assert first == 0
    assert second == 0
    assert first_bundle == second_bundle
