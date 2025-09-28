from evals.agentic.harness import AgenticEvalHarness
from evals.agentic.schemas import EvalRecord

def test_r1_minimal_pass():
    h = AgenticEvalHarness("r1_rapid_attribution")
    case = {"id":"case-001","query":"...","inputs":{}}
    rec = h.evaluate_case(case)
    assert isinstance(rec, EvalRecord)
    assert isinstance(rec.run_id, str)
    assert rec.score >= 0.0
    # Further assertions can be added here to check e2e_ok, first_failure_at, etc.
    # based on the expected behavior of the dummy runner and llm_judge.
