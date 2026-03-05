from .schema import RunPlan

REQUIRED_FIELDS = (
    "goal",
    "constraints",
    "acceptance_criteria",
    "risks",
    "non_goals",
)


def build_run_plan(payload: dict) -> RunPlan:
    validate_run_plan(payload)
    return RunPlan(**payload)


def validate_run_plan(payload: dict) -> None:
    missing = [field for field in REQUIRED_FIELDS if field not in payload]
    if missing:
        raise ValueError(f"missing required plan fields: {', '.join(sorted(missing))}")

    for field in REQUIRED_FIELDS[1:]:
        if not isinstance(payload[field], list) or not payload[field]:
            raise ValueError(f"field '{field}' must be a non-empty list")

    if not isinstance(payload["goal"], str) or not payload["goal"].strip():
        raise ValueError("field 'goal' must be a non-empty string")
