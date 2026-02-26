import json
import os
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
GENERATOR_PATH = REPO_ROOT / "scripts" / "generate_agent_docs.py"
POLICY_CHECK_PATH = REPO_ROOT / "scripts" / "policy" / "agent_doc_policy_check.py"


def _run_generator(output_dir: Path) -> subprocess.CompletedProcess:
    env = os.environ.copy()
    env["AGENT_DOCS_ENABLED"] = "true"
    env["AGENT_DOCS_TIMESTAMP"] = "2000-01-01T00:00:00Z"
    env["GIT_COMMIT"] = "TEST_COMMIT"

    return subprocess.run(
        [sys.executable, str(GENERATOR_PATH), "--output-dir", str(output_dir)],
        capture_output=True,
        text=True,
        env=env,
        check=False,
    )


def _run_policy_check(input_dir: Path) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, str(POLICY_CHECK_PATH), "--input-dir", str(input_dir)],
        capture_output=True,
        text=True,
        check=False,
    )


def test_policy_check_accepts_generated_doc(tmp_path: Path) -> None:
    output_dir = tmp_path / "ok"
    generated = _run_generator(output_dir)
    assert generated.returncode == 0

    checked = _run_policy_check(output_dir)
    assert checked.returncode == 0
    assert "OK policy constraints validated" in checked.stdout


def test_policy_check_rejects_missing_side_effects(tmp_path: Path) -> None:
    output_dir = tmp_path / "bad"
    generated = _run_generator(output_dir)
    assert generated.returncode == 0

    doc_path = output_dir / "summit.agent.json"
    doc = json.loads(doc_path.read_text(encoding="utf-8"))
    doc["side_effects"] = []
    doc_path.write_text(json.dumps(doc, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    checked = _run_policy_check(output_dir)
    assert checked.returncode == 1
    assert "FAIL agent-doc policy lint violations" in checked.stdout
