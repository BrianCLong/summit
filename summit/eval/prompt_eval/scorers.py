import re
from typing import Any, Callable, Dict, List


def format_compliance_rate(outputs: list[str], expected_format: str) -> float:
    """
    Calculate the percentage of outputs that match the expected format.
    expected_format can be a regex string or a simple keyword like 'one-word'.
    """
    if not outputs:
        return 0.0

    matches = 0
    for output in outputs:
        if check_format(output, expected_format):
            matches += 1

    return matches / len(outputs)

def check_format(output: str, fmt: str) -> bool:
    if fmt == "one-word":
        return len(output.strip().split()) == 1
    # Assume regex for other cases
    try:
        return bool(re.match(fmt, output.strip()))
    except re.error:
        # Fallback to simple containment if regex fails
        return fmt in output

def decomposition_success_rate(trace: list[dict[str, Any]]) -> float:
    """
    Score how well a task was decomposed.
    Expects a trace of steps.
    """
    if not trace:
        return 0.0

    # Simple heuristic: did it have more than 1 step and did final step succeed?
    # This assumes trace contains 'step_type' and 'status'
    steps = [t for t in trace if t.get("type") == "step"]
    if len(steps) < 2:
        return 0.0 # No decomposition happened

    successes = [t for t in steps if t.get("status") == "success"]
    return len(successes) / len(steps)
