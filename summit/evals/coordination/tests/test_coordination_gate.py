import json
import subprocess


def test_coordination_gate_fails_when_below_threshold(tmp_path):
    metrics = tmp_path / "coordination_metrics.json"
    metrics.write_text(json.dumps({"coordination_score": 0.5}), encoding="utf-8")

    cmd = [
        "python",
        "summit/ci/check_coordination.py",
        "--metrics",
        str(metrics),
        "--threshold",
        "0.85",
    ]
    run = subprocess.run(cmd, check=False, capture_output=True, text=True)
    assert run.returncode == 1
