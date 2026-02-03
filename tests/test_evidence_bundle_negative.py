import json
import pathlib
import subprocess
import sys


def write_json(path: pathlib.Path, payload: object) -> None:
    path.write_text(json.dumps(payload, sort_keys=True), encoding="utf-8")


def test_missing_stamp_is_rejected(tmp_path: pathlib.Path) -> None:
    evidence_dir = tmp_path / "evidence"
    evidence_dir.mkdir()

    write_json(
        evidence_dir / "report.json",
        {
            "run_id": "run-1",
            "evidence": [
                {
                    "evidence_id": "EVD-ru-ua-cogwar-lab-2025-schema-001",
                    "status": "pass",
                    "artifacts": ["schemas/cogwar/campaign.schema.json"],
                }
            ],
            "summary": "ok",
        },
    )
    write_json(evidence_dir / "metrics.json", {"run_id": "run-1", "metrics": []})
    write_json(
        evidence_dir / "index.json",
        {
            "run_id": "run-1",
            "entries": [
                {
                    "evidence_id": "EVD-ru-ua-cogwar-lab-2025-schema-001",
                    "files": ["report.json"],
                }
            ],
        },
    )

    tool = pathlib.Path(__file__).resolve().parents[1] / "tools" / "validate_evidence_bundle.py"
    result = subprocess.run(
        [sys.executable, str(tool), str(evidence_dir)],
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode != 0
    assert "missing evidence files" in result.stderr
