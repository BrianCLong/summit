import json
import pathlib

import pytest

from evals.society_of_thought.run_eval import run_smoke


def test_eval_artifacts_reproducibility(tmp_path, monkeypatch):
    # Setup temp evidence dir
    evidence_dir = tmp_path / "evidence"
    evidence_dir.mkdir()
    (evidence_dir / "index.json").write_text(json.dumps({"version": "1.0", "items": []}))

    # Monkeypatch ROOT in run_eval
    import evals.society_of_thought.run_eval as run_eval
    monkeypatch.setattr(run_eval, "ROOT", tmp_path)

    # Run twice
    run_smoke()
    report1 = json.loads((evidence_dir / "EVD-SOT-EVAL-001" / "report.json").read_text())
    metrics1 = json.loads((evidence_dir / "EVD-SOT-EVAL-001" / "metrics.json").read_text())

    run_smoke()
    report2 = json.loads((evidence_dir / "EVD-SOT-EVAL-001" / "report.json").read_text())
    metrics2 = json.loads((evidence_dir / "EVD-SOT-EVAL-001" / "metrics.json").read_text())

    # Assert stability (ignoring timestamp which is in stamp.json)
    assert report1 == report2
    assert metrics1 == metrics2

def test_stamp_changes(tmp_path, monkeypatch):
    evidence_dir = tmp_path / "evidence"
    evidence_dir.mkdir()
    (evidence_dir / "index.json").write_text(json.dumps({"version": "1.0", "items": []}))

    import evals.society_of_thought.run_eval as run_eval
    monkeypatch.setattr(run_eval, "ROOT", tmp_path)

    run_smoke()
    stamp1 = json.loads((evidence_dir / "EVD-SOT-EVAL-001" / "stamp.json").read_text())

    import time
    time.sleep(0.1)

    run_smoke()
    stamp2 = json.loads((evidence_dir / "EVD-SOT-EVAL-001" / "stamp.json").read_text())

    # Timestamp should be different
    assert stamp1["timestamp"] != stamp2["timestamp"]
