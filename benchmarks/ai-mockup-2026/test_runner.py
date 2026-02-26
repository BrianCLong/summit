from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
RUNNER = ROOT / "runner.py"


def run_runner(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    cmd = ["python3", str(RUNNER), "--output-dir", str(tmp_path), *args]
    return subprocess.run(cmd, check=False, capture_output=True, text=True)


def test_outputs_are_deterministic_and_traceable(tmp_path: Path) -> None:
    result = run_runner(tmp_path, "--check")
    assert result.returncode == 0, result.stderr + result.stdout

    report = json.loads((tmp_path / "report.json").read_text(encoding="utf-8"))
    metrics = json.loads((tmp_path / "metrics.json").read_text(encoding="utf-8"))

    assert report["benchmark_id"] == "ai-mockup-2026"
    assert metrics["coverage"]["claims_total"] == 10

    for tool in report["tools"]:
        assert tool["evidence"].startswith("ITEM:CLAIM-")


def test_hash_drift_fails_without_fixture_update(tmp_path: Path) -> None:
    fixture = ROOT / "fixtures" / "determinism.sha256"
    original = fixture.read_text(encoding="utf-8")
    fixture.write_text("deadbeef\n", encoding="utf-8")
    try:
        result = run_runner(tmp_path, "--check")
        assert result.returncode != 0
        assert "Determinism hash changed without fixture update" in result.stdout
    finally:
        fixture.write_text(original, encoding="utf-8")
