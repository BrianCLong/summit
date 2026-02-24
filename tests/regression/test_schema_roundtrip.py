import json
import os
import re
import subprocess
import sys
from pathlib import Path


def _run_eval(script_path: str, env: dict[str, str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, script_path],
        capture_output=True,
        text=True,
        env=env,
        check=False,
    )


def _parse_evidence_dir(stdout: str) -> str:
    match = re.search(r"Evidence generated at (.+)", stdout)
    assert match, f"Could not find evidence directory in stdout: {stdout}"
    return match.group(1).strip()


def test_schema_roundtrip(tmp_path: Path):
    root_dir = os.getcwd()
    script_path = os.path.join(root_dir, "evals/influence_ops/schema_roundtrip_eval.py")

    assert os.path.exists(script_path), f"Script not found at {script_path}"

    generated_at = "2026-02-11T00:00:00Z"
    evidence_id = "EVID::local::io::schema_roundtrip::2026-02-11::a1b2c3d::9f2a1c0b"

    run_one_env = os.environ.copy()
    run_one_env.update(
        {
            "INFLUENCE_OPS_EVAL_GENERATED_AT": generated_at,
            "INFLUENCE_OPS_EVAL_EVIDENCE_ID": evidence_id,
            "INFLUENCE_OPS_EVAL_RUN_ID": "9f2a1c0b",
            "INFLUENCE_OPS_EVAL_EVIDENCE_ROOT": str(tmp_path / "run-one"),
        }
    )
    result_one = _run_eval(script_path, env=run_one_env)

    assert (
        result_one.returncode == 0
    ), f"Eval script failed with code {result_one.returncode}: {result_one.stderr}"
    evidence_dir_one = Path(_parse_evidence_dir(result_one.stdout))

    run_two_env = os.environ.copy()
    run_two_env.update(
        {
            "INFLUENCE_OPS_EVAL_GENERATED_AT": generated_at,
            "INFLUENCE_OPS_EVAL_EVIDENCE_ID": evidence_id,
            "INFLUENCE_OPS_EVAL_RUN_ID": "9f2a1c0b",
            "INFLUENCE_OPS_EVAL_EVIDENCE_ROOT": str(tmp_path / "run-two"),
        }
    )
    result_two = _run_eval(script_path, env=run_two_env)

    assert (
        result_two.returncode == 0
    ), f"Eval script failed with code {result_two.returncode}: {result_two.stderr}"
    evidence_dir_two = Path(_parse_evidence_dir(result_two.stdout))

    report_one = (evidence_dir_one / "report.json").read_text(encoding="utf-8")
    report_two = (evidence_dir_two / "report.json").read_text(encoding="utf-8")
    metrics_one = (evidence_dir_one / "metrics.json").read_text(encoding="utf-8")
    metrics_two = (evidence_dir_two / "metrics.json").read_text(encoding="utf-8")
    stamp_one = (evidence_dir_one / "stamp.json").read_text(encoding="utf-8")
    stamp_two = (evidence_dir_two / "stamp.json").read_text(encoding="utf-8")

    assert report_one == report_two
    assert metrics_one == metrics_two
    assert stamp_one == stamp_two

    report = json.loads(report_one)
    metrics = json.loads(metrics_one)
    stamp = json.loads(stamp_one)

    assert report["suite"] == "influence_ops_schema_roundtrip"
    assert report["evidence_id"] == evidence_id
    assert len(report["schema_files"]) == 3
    assert metrics["total_schemas"] == 3
    assert metrics["valid_schemas"] == 3
    assert metrics["invalid_schemas"] == 0
    assert metrics["run_id"] == "9f2a1c0b"
    assert stamp["evidence_id"] == evidence_id
    assert stamp["run_id"] == "9f2a1c0b"
    assert stamp["generated_at"] == "2026-02-11T00:00:00+00:00"
