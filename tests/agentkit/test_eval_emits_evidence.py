import json
from pathlib import Path
from summit.agentkit.eval.runner import EvalRunner

def test_eval_runner_emits_evidence(tmp_path):
    runner = EvalRunner(evidence_dir=tmp_path)

    def fixture_success():
        return {"ok": True}

    runner.run_fixture("test-fixture", fixture_success)

    report_file = tmp_path / "report.json"
    assert report_file.exists()

    with open(report_file) as f:
        data = json.load(f)

    assert len(data["steps"]) == 1
    assert data["steps"][0]["name"] == "test-fixture"
    assert data["steps"][0]["status"] == "pass"
