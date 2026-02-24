from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RUN_AGENT = ROOT / "scripts" / "tooling" / "run_agent.py"
TIMESTAMP_KEYS = {"timestamp", "generated_at", "created_at", "updated_at", "started_at", "finished_at"}


def run_agent(output_dir: Path, enabled: bool = True) -> None:
    env = dict(os.environ)
    env["TOOLING_AGENT_ENABLED"] = "true" if enabled else "false"
    env["GITHUB_SHA"] = "local"
    subprocess.run(
        [sys.executable, str(RUN_AGENT), "--task", "example", "--output-dir", str(output_dir)],
        cwd=ROOT,
        env=env,
        check=True,
        capture_output=True,
        text=True,
    )


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def assert_no_timestamp_keys(value: object) -> None:
    if isinstance(value, dict):
        for key, nested in value.items():
            assert key not in TIMESTAMP_KEYS
            assert_no_timestamp_keys(nested)
    elif isinstance(value, list):
        for item in value:
            assert_no_timestamp_keys(item)


def test_run_agent_emits_deterministic_artifacts(tmp_path: Path) -> None:
    run1 = tmp_path / "run1"
    run2 = tmp_path / "run2"

    run_agent(run1)
    run_agent(run2)

    for name in ("report.json", "metrics.json", "stamp.json"):
        assert (run1 / name).exists()
        assert (run2 / name).exists()
        assert read_text(run1 / name) == read_text(run2 / name)

    report = json.loads(read_text(run1 / "report.json"))
    metrics = json.loads(read_text(run1 / "metrics.json"))
    stamp = json.loads(read_text(run1 / "stamp.json"))

    assert report["status"] == "ready"
    assert report["injection_detected"] is False
    assert report["evidence_id"] == metrics["evidence_id"] == stamp["evidence_id"]
    assert metrics["deterministic"] is True
    assert stamp["git_sha"] == "local"

    assert_no_timestamp_keys(report)
    assert_no_timestamp_keys(metrics)


def test_run_agent_respects_default_off_flag(tmp_path: Path) -> None:
    out = tmp_path / "disabled"
    run_agent(out, enabled=False)
    report = json.loads(read_text(out / "report.json"))
    assert report["status"] == "disabled"
