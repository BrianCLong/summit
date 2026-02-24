from __future__ import annotations

import json
from pathlib import Path

from summit.__main__ import main as summit_main


def _write_plan(path: Path) -> None:
    plan = {
        "name": "cli_demo",
        "policy": {"name": "computer_use_deny_by_default"},
        "steps": [
            {"id": "s1", "action": "open_page", "target": "workspace:home"},
            {"id": "s2", "action": "extract_text", "input": "collect notes"},
        ],
    }
    path.write_text(json.dumps(plan, indent=2, sort_keys=True), encoding="utf-8")


def test_agent_run_disabled_by_default(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.delenv("COMPUTER_USE_AGENT_ENABLED", raising=False)
    plan_path = tmp_path / "computer_use_demo.yaml"
    _write_plan(plan_path)

    rc = summit_main(
        [
            "agent",
            "run",
            str(plan_path),
            "--output-dir",
            str(tmp_path / "out"),
        ]
    )
    assert rc == 2


def test_agent_run_emits_artifacts_when_enabled(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("COMPUTER_USE_AGENT_ENABLED", "true")
    plan_path = tmp_path / "computer_use_demo.yaml"
    output_dir = tmp_path / "out"
    _write_plan(plan_path)

    rc = summit_main(
        [
            "agent",
            "run",
            str(plan_path),
            "--output-dir",
            str(output_dir),
        ]
    )
    assert rc == 0
    assert (output_dir / "report.json").exists()
    assert (output_dir / "metrics.json").exists()
    assert (output_dir / "stamp.json").exists()
