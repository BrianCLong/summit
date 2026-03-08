import json
import logging

logger = logging.getLogger(__name__)

class IntentValidator:
    def __init__(self, schema_path="schemas/intent_spec.schema.json"):
        self.schema_path = schema_path
        with open(schema_path) as f:
            self.schema = json.load(f)

    def validate_spec(self, spec_data: dict) -> dict:
        """
        Validates the parsed spec_data against the intent schema.
        Note: Currently implemented as a simple rules engine since strict schema validation
        might require extra libraries (jsonschema).
        """
        errors = []
        if "intent_id" not in spec_data:
            errors.append("intent_id is required")

        if "objective" in spec_data:
            obj = spec_data["objective"]
            if "description" not in obj or "success_criteria" not in obj:
                errors.append("objective requires description and success_criteria")

        is_valid = len(errors) == 0

        return {
            "is_valid": is_valid,
            "errors": errors,
            "spec_data": spec_data
        }

    def evaluate_constraints(self, spec_data: dict, execution_context: dict) -> dict:
        """
        Evaluates dynamic constraints and stop rules given an execution context.
        """
        constraint_violations = []

        constraints = spec_data.get("constraints", [])
        if isinstance(constraints, list):
            for constraint in constraints:
                ctype = constraint.get("type")
                if ctype == "deterministic_output":
                    if not execution_context.get("is_deterministic", False):
                        constraint_violations.append("deterministic_output constraint failed")
                elif ctype == "no_external_calls":
                    if execution_context.get("external_calls_made", 0) > 0:
                        constraint_violations.append("no_external_calls constraint failed")
                else:
                    constraint_violations.append(f"Unknown constraint type: {ctype}")

        return {
            "passed": len(constraint_violations) == 0,
            "violations": constraint_violations
        }
