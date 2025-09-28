import os
import json
from typing import List, Tuple, Dict, Any, Optional
from ..schemas import StepResult

def _get_value_by_path(data: Dict[str, Any], path: str) -> Any:
    """
    Safely retrieves a nested value from a dictionary using a dot-separated path.
    Returns None if any part of the path is not found.
    """
    keys = path.split('.')
    current_value = data
    for key in keys:
        if isinstance(current_value, dict) and key in current_value:
            current_value = current_value[key]
        else:
            return None
    return current_value

def _evaluate_rule(steps: List[StepResult], rule: Dict[str, Any]) -> bool:
    """
    Evaluates a single rubric rule against the given steps.
    """
    rule_type = rule["type"]
    path = rule.get("path")

    # For rules that check final output, we assume the last step contains it
    final_output = steps[-1].output if steps else {}

    if rule_type == "exact_match":
        expected_value = rule["value"]
        actual_value = _get_value_by_path(final_output, path)
        return actual_value == expected_value

    elif rule_type == "side_effect_exists":
        kind = rule["kind"]
        label = rule["label"]
        must_include_props = rule.get("must_include_props", [])

        for step in steps:
            # Assuming side effects are in step.output.side_effects or step.meta.side_effects
            side_effects = step.output.get("side_effects", []) + step.meta.get("side_effects", [])
            for se in side_effects:
                if se.get("kind") == kind and se.get("label") == label:
                    # Check if all required properties are present
                    if all(prop in se for prop in must_include_props):
                        return True
        return False

    elif rule_type == "json_schema_valid":
        # This would require a JSON schema validator library (e.g., jsonschema)
        # For now, we'll just check if the path exists and is valid JSON (if string)
        value_to_validate = _get_value_by_path(final_output, path)
        if value_to_validate is None:
            return False
        try:
            # If it's a string, try to parse it as JSON
            if isinstance(value_to_validate, str):
                json.loads(value_to_validate)
            return True
        except json.JSONDecodeError:
            return False

    elif rule_type == "min_len":
        min_length = rule["min"]
        actual_value = _get_value_by_path(final_output, path)
        if isinstance(actual_value, (list, str, dict)):
            return len(actual_value) >= min_length
        return False

    # Add other rule types as needed
    return False

def llm_judge(steps: List[StepResult], rubric: Dict[str, Any]) -> Tuple[bool, float, str]:
    """
    Apply deterministic rules first; then use LLM-as-judge for fuzzy parts.
    For now, simulate with rubric rules only — plug in provider later.
    """
    pass_ok = True
    score = 1.0
    judge_id = "llm_gptX_v1"

    # Evaluate success_rule
    success_rule = rubric.get("success_rule")
    if success_rule:
        if success_rule["type"] == "composite_all":
            for rule in success_rule["rules"]:
                if not _evaluate_rule(steps, rule):
                    pass_ok = False
                    break
        # Add other composite types (e.g., composite_any) as needed

    # Compute weighted partials (simplified for now)
    partials = rubric.get("partials", [])
    if not pass_ok: # If main success rule fails, partials don't make it pass
        score = 0.0
    else:
        # For simplicity, if pass_ok is true, and there are partials, we can adjust score
        # A more complex scoring would sum weights of passing partials.
        # For now, if pass_ok is true, and no partials fail, score is 1.0
        # If pass_ok is true, but some partials are not met, score might be less than 1.0
        # This is a placeholder for more sophisticated partial scoring.
        for partial in partials:
            if not _evaluate_rule(steps, partial["rule"]):
                score -= partial["weight"] # Deduct weight if partial fails
        score = max(0.0, score) # Ensure score doesn't go below 0

    # TODO: Integrate actual LLM-as-judge for fuzzy parts or more complex evaluations

    return pass_ok, score, judge_id