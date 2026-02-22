from typing import Dict, Any

def calculate_reward(
    item_f1: float,
    is_format_valid: bool,
    has_tool_usage: bool,
    response_length: int,
    alpha_len: float = 0.001
) -> float:
    """
    Calculates the reward for a WideSeek rollout.
    R = rans + rformat + rtool - rlen

    If format is invalid, paper says reward is 0 (or heavily penalized).
    Let's assume strict 0 for everything if format is invalid, as per paper claim "invalid format -> reward 0".
    """
    if not is_format_valid:
        return 0.0

    r_ans = item_f1
    r_format = 1.0 # Implicitly 1 if we passed the check, but maybe we want to add it explicitly?
                   # If we return 0 on invalid, then r_format is the gate.
                   # Let's add a bonus for format being valid if we want to encourage it,
                   # but if it's 0 otherwise, then the whole R is 0.
                   # Let's define R = r_ans + r_format_bonus + r_tool - penalty

    r_format_val = 0.1 # Small bonus for just getting format right? Or maybe included in gate.
    # Paper: "rformat (valid Markdown)" -> suggests a component.

    r_tool = 0.1 if has_tool_usage else 0.0
    r_len = alpha_len * response_length

    total = r_ans + r_format_val + r_tool - r_len
    return max(total, 0.0) # Ensure non-negative? Or allow negative? RL usually allows negative.
                           # But "invalid format -> 0" suggests 0 is the floor for bad format.
