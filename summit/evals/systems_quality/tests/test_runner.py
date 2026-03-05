import pytest
import os
import json
from unittest.mock import patch
from summit.evals.systems_quality.runner import SystemsQualityEvaluator
from summit.evals.systems_quality.schemas import SystemQualityReport

@patch("summit.evals.systems_quality.runner.calculate_defect_density")
@patch("summit.evals.systems_quality.runner.calculate_rework_rate")
@patch("summit.evals.systems_quality.runner.calculate_variance_score")
def test_runner_run(mock_var, mock_rework, mock_defect):
    mock_defect.return_value = 0.1
    mock_rework.return_value = 0.2
    mock_var.return_value = 0.05

    runner = SystemsQualityEvaluator()
    report = runner.run(
        repo_path="/tmp/repo",
        commit_range="HEAD~1..HEAD",
        agent_id="test-agent",
        test_results={"failed": 5}
    )

    assert isinstance(report, SystemQualityReport)
    assert report.metrics.defect_density == 0.1
    assert report.metrics.rework_rate == 0.2
    assert report.metrics.variance_score == 0.05
    assert report.agent_id == "test-agent"

def test_save_report(tmpdir):
    runner = SystemsQualityEvaluator()
    # Create a dummy report object (mocking or manually instantiating)
    # Using real run to get a valid report
    with patch("summit.evals.systems_quality.runner.calculate_defect_density", return_value=0.0), \
         patch("summit.evals.systems_quality.runner.calculate_rework_rate", return_value=0.0), \
         patch("summit.evals.systems_quality.runner.calculate_variance_score", return_value=0.0):

        report = runner.run("/tmp", "range", "agent", {})

        output_dir = str(tmpdir)
        report_path = runner.save_report(report, output_dir)

        expected_file = os.path.join(output_dir, "report.json")
        assert os.path.exists(expected_file)
        assert report_path == expected_file

        with open(expected_file) as f:
            data = json.load(f)
            assert data["evidence_id"] == report.evidence_id
