from evals.agentic.harness import AgenticEvalHarness, StepResult, EvalRecord, Rubric
from typing import Dict, Any, List, Callable
import time

# Dummy run_workflow function
def dummy_run_workflow(case: Dict[str, Any]) -> List[StepResult]:
    print(f"Running workflow for case: {case['id']}")
    steps = []
    # Simulate some steps
    step1_details = {"output": "processed data A", "cost_usd": 0.01}
    if case.get("include_side_effect_in_step1"):
        step1_details["side_effects"] = ["ticket created"]

    steps.append(StepResult(
        step_id="step_1",
        ok=True,
        details=step1_details,
        started_at=time.time(),
        ended_at=time.time() + 0.1
    ))
    steps.append(StepResult(
        step_id="step_2",
        ok=False if case.get("fail_at_step_2") else True,
        details={"output": "processed data B", "cost_usd": 0.02},
        started_at=time.time() + 0.1,
        ended_at=time.time() + 0.2
    ))
    final_output = "final result for " + case["id"]
    if case.get("custom_final_output"):
        final_output = case["custom_final_output"]

    steps.append(StepResult(
        step_id="step_3",
        ok=True,
        details={"output": final_output, "cost_usd": 0.015},
        started_at=time.time() + 0.2,
        ended_at=time.time() + 0.3
    ))
    return steps

# Dummy success_rule function - now uses golden fixtures and accepts case
def dummy_success_rule_with_fixtures(steps: List[StepResult], case: Dict[str, Any], golden_fixtures: Dict[str, Any]) -> bool:
    case_id = case["id"]
    # Workflow is successful if all steps are ok AND matches golden fixture
    if not all(s.ok for s in steps):
        return False

    expected_output = golden_fixtures.get(case_id, {}).get("expected_output")
    if expected_output:
        actual_final_output = steps[-1].details.get("output")
        if actual_final_output != expected_output:
            print(f"Mismatch for {case_id}: Expected '{expected_output}', Got '{actual_final_output}'")
            return False

    # Check for expected side effects from golden fixtures
    expected_side_effects = golden_fixtures.get(case_id, {}).get("expected_side_effects", [])
    for expected_effect in expected_side_effects:
        found_effect = False
        for step in steps:
            if "side_effects" in step.details and expected_effect in step.details["side_effects"]:
                found_effect = True
                break
        if not found_effect:
            print(f"Missing expected side effect for {case_id}: {expected_effect}")
            return False

    return True

# Original dummy judge function - now accepts case
def dummy_judge(steps: List[StepResult], rubric: Rubric, case: Dict[str, Any], golden_fixtures: Dict[str, Any]) -> bool:
    print(f"Judging with original dummy judge and rubric: {rubric.name}")
    return dummy_success_rule_with_fixtures(steps, case, golden_fixtures)

# New dummy judge function that checks for required side effects - now accepts case
def dummy_side_effect_judge(steps: List[StepResult], rubric: Rubric, case: Dict[str, Any], golden_fixtures: Dict[str, Any]) -> bool:
    print(f"Judging with side effect judge and rubric: {rubric.name}")
    # First, check the base success rule (including golden fixtures)
    if not dummy_success_rule_with_fixtures(steps, case, golden_fixtures):
        return False

    # Then, check for required side effects from the rubric
    for required_effect in rubric.required_side_effects:
        found_effect = False
        for step in steps:
            if "side_effects" in step.details and required_effect in step.details["side_effects"]:
                found_effect = True
                break
        if not found_effect:
            print(f"Missing required side effect from rubric: {required_effect}")
            return False
    return True

if __name__ == "__main__":
    # Define a sample Rubric
    sample_rubric = Rubric(
        name="Rapid Attribution Rubric V1",
        description="Evaluates the accuracy and completeness of rapid attribution workflows.",
        acceptance_rules=["All steps must complete successfully", "Final output must contain attribution ID"],
        partial_credit_scoring={
            "step_1": 0.3,
            "step_2": 0.4,
            "step_3": 0.3
        },
        required_citations=True,
        required_side_effects=["ticket created", "graph mutated"]
    )

    # Define sample Golden Fixtures
    golden_fixtures = {
        "case_1_orig": {"expected_output": "final result for case_1_orig"},
        "case_3_se": {"expected_output": "final result for case_3_se", "expected_side_effects": ["ticket created"]},
        "case_4_se": {"expected_output": "final result for case_4_se", "expected_side_effects": ["ticket created", "graph mutated"]},
        "case_6_golden_match": {"expected_output": "specific golden output", "expected_side_effects": ["ticket created", "graph mutated"]}
    }

    # --- Evaluate with original dummy_judge ---
    print("\n=== Evaluating with Original Dummy Judge ===")
    harness_original_judge = AgenticEvalHarness(
        run_workflow=dummy_run_workflow,
        success_rule=lambda steps, case: dummy_success_rule_with_fixtures(steps, case, golden_fixtures),
        judge=lambda steps, rubric, case: dummy_judge(steps, rubric, case, golden_fixtures),
        rubric=sample_rubric,
        results_dir="evals/agentic/results"
    )

    # Case 1: Success (original judge)
    case_1_orig = {"id": "case_1_orig", "input": "sample input 1"}
    print("\n--- Evaluating Case 1 (Success) with Original Judge ---")
    harness_original_judge.evaluate("R1 Rapid Attribution", case_1_orig)

    # Case 2: Failure (original judge)
    case_2_orig = {"id": "case_2_orig", "input": "sample input 2", "fail_at_step_2": True}
    print("\n--- Evaluating Case 2 (Failure) with Original Judge ---")
    harness_original_judge.evaluate("R1 Rapid Attribution", case_2_orig)

    # --- Evaluate with new dummy_side_effect_judge ---
    print("\n=== Evaluating with Side Effect Judge ===")
    harness_side_effect_judge = AgenticEvalHarness(
        run_workflow=dummy_run_workflow,
        success_rule=lambda steps, case: dummy_success_rule_with_fixtures(steps, case, golden_fixtures),
        judge=lambda steps, rubric, case: dummy_side_effect_judge(steps, rubric, case, golden_fixtures), # Plug in the new judge
        rubric=sample_rubric,
        results_dir="evals/agentic/results"
    )

    # Case 3: Success, but missing side effect (side effect judge)
    case_3_se = {"id": "case_3_se", "input": "sample input 3"}
    print("\n--- Evaluating Case 3 (Missing Side Effect) with Side Effect Judge ---")
    harness_side_effect_judge.evaluate("R1 Rapid Attribution", case_3_se)

    # Case 4: Success, with one side effect (side effect judge)
    case_4_se = {"id": "case_4_se", "input": "sample input 4", "include_side_effect_in_step1": True}
    print("\n--- Evaluating Case 4 (One Side Effect) with Side Effect Judge ---")
    harness_side_effect_judge.evaluate("R1 Rapid Attribution", case_4_se)

    # Case 5: Failure, missing side effect (side effect judge)
    case_5_se = {"id": "case_5_se", "input": "sample input 5", "fail_at_step_2": True}
    print("\n--- Evaluating Case 5 (Failure) with Side Effect Judge ---")
    harness_side_effect_judge.evaluate("R1 Rapid Attribution", case_5_se)

    # Case 6: Golden fixture match (side effect judge)
    case_6_golden_match = {"id": "case_6_golden_match", "input": "golden input", "include_side_effect_in_step1": True, "custom_final_output": "specific golden output"}
    print("\n--- Evaluating Case 6 (Golden Match) with Side Effect Judge ---")
    harness_side_effect_judge.evaluate("R1 Rapid Attribution", case_6_golden_match)