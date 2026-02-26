import json
import os
import re
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT_PATH = REPO_ROOT / "scripts" / "generate_agent_docs.py"


def _run_generator(output_dir: Path, enabled: bool, check: bool = False) -> subprocess.CompletedProcess:
    env = os.environ.copy()
    if enabled:
        env["AGENT_DOCS_ENABLED"] = "true"
    else:
        env.pop("AGENT_DOCS_ENABLED", None)
    env["AGENT_DOCS_TIMESTAMP"] = "2000-01-01T00:00:00Z"
    env["GIT_COMMIT"] = "TEST_COMMIT"

    cmd = [sys.executable, str(SCRIPT_PATH), "--output-dir", str(output_dir)]
    if check:
        cmd.append("--check")

    return subprocess.run(cmd, capture_output=True, text=True, env=env, check=False)


def test_generator_is_disabled_by_default(tmp_path: Path) -> None:
    out_dir = tmp_path / "disabled"
    result = _run_generator(out_dir, enabled=False)

    assert result.returncode == 0
    assert "AGENT_DOCS_ENABLED is false" in result.stdout
    assert not out_dir.exists()


def test_generator_is_deterministic(tmp_path: Path) -> None:
    out_a = tmp_path / "a"
    out_b = tmp_path / "b"

    first = _run_generator(out_a, enabled=True)
    second = _run_generator(out_b, enabled=True)

    assert first.returncode == 0
    assert second.returncode == 0

    expected_files = ["summit.agent.json", "report.json", "metrics.json", "stamp.json"]
    for filename in expected_files:
        assert (out_a / filename).read_text(encoding="utf-8") == (out_b / filename).read_text(
            encoding="utf-8"
        )

    timestamp_pattern = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}")
    for deterministic_file in ["summit.agent.json", "report.json", "metrics.json"]:
        contents = (out_a / deterministic_file).read_text(encoding="utf-8")
        assert timestamp_pattern.search(contents) is None


def test_check_mode_detects_drift(tmp_path: Path) -> None:
    out_dir = tmp_path / "check"
    generated = _run_generator(out_dir, enabled=True)
    assert generated.returncode == 0

    report_path = out_dir / "report.json"
    report = json.loads(report_path.read_text(encoding="utf-8"))
    report["summary"] = "drifted"
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    checked = _run_generator(out_dir, enabled=True, check=True)
    assert checked.returncode == 1
    assert "FAIL drift detected" in checked.stdout
