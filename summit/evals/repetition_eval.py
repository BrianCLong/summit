from __future__ import annotations

from typing import Any, Dict

from summit.policy.repetition_detector import classify_repetition
from summit.policy.repetition_transform import reinforce_constraints


def evaluate_prompt_hygiene(prompt: str) -> dict[str, Any]:
    """
    Evaluates prompt hygiene regarding repetition.
    Returns metrics and transformation candidates.
    """
    classification = classify_repetition(prompt)

    transformed_prompt = None
    if classification["class"] != "harmful":
        # Apply beneficial reinforcement if not already harmful
        transformed_prompt = reinforce_constraints(prompt)

    return {
        "classification": classification,
        "transformed_prompt": transformed_prompt,
        "action_taken": "flagged" if classification["class"] == "harmful" else "reinforced" if transformed_prompt != prompt else "none"
    }
