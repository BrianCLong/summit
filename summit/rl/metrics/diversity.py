from typing import List, Dict, Union
import statistics

def calculate_mixed_outcome_rate(rewards: List[float]) -> float:
    """
    Calculates whether a group has mixed outcomes (some success, some failure).
    Useful for detecting if SAGE is effectively exploring diverse solutions.
    Returns 1.0 if group has both success (>0) and failure (<=0), else 0.0.
    """
    if not rewards:
        return 0.0

    has_success = any(r > 0 for r in rewards)
    has_failure = any(r <= 0 for r in rewards)
    return 1.0 if (has_success and has_failure) else 0.0

def calculate_group_stats(rewards: List[float]) -> Dict[str, float]:
    """
    Computes summary stats for a group's rewards.
    """
    if not rewards:
        return {"mean": 0.0, "std": 0.0, "mixed": 0.0}

    return {
        "mean": statistics.mean(rewards),
        "std": statistics.stdev(rewards) if len(rewards) > 1 else 0.0,
        "mixed": calculate_mixed_outcome_rate(rewards)
    }

def detect_advantage_collapse(advantages: List[float], threshold: float = 1e-4) -> bool:
    """
    Returns True if advantages are collapsed (variance below threshold).
    """
    if len(advantages) < 2:
        return False
    return statistics.variance(advantages) < threshold
