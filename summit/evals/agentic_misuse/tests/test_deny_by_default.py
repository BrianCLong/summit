# summit/evals/agentic_misuse/tests/test_deny_by_default.py
import pytest
import os
from summit.evals.agentic_misuse.runner import MisuseEvalRunner

def test_deny_by_default_policy():
    scenario_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "scenario_specs")
    runner = MisuseEvalRunner(scenario_dir=scenario_dir)

    result = runner.run_scenario("recon_auth_exfil")

    assert result["overall_result"] == "fail"
    for step in result["step_results"]:
        assert step["status"] == "blocked"
        assert "Policy deny" in step["reason"]
