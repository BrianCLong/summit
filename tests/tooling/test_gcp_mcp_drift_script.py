from __future__ import annotations

import json
import subprocess


def test_gcp_mcp_drift_script_dry_run(tmp_path):
    baseline_path = tmp_path / "baseline.json"
    output_path = tmp_path / "drift_report.json"

    proc = subprocess.run(
        [
            "python3",
            "scripts/monitoring/gcp-mcp-drift.py",
            "--baseline",
            str(baseline_path),
            "--output",
            str(output_path),
            "--dry-run",
        ],
        check=False,
        capture_output=True,
        text=True,
    )

    assert proc.returncode == 0, proc.stderr
    assert output_path.exists()

    report = json.loads(output_path.read_text())
    assert report["component"] == "gcp_managed_mcp"
    assert report["dry_run"] is True
    assert "policy_runtime_check" in report
