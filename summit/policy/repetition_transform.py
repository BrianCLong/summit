from __future__ import annotations


def reinforce_constraints(prompt: str) -> str:
    """
    Appends a structured constraint reminder block to the prompt.
    This acts as a 'controlled repetition' to improve adherence.
    """
    if not prompt:
        return prompt

    marker = "[CONSTRAINT REMINDER BLOCK]"
    if marker in prompt:
        return prompt

    reinforcement = (
        f"\n\n{marker}\n"
        "Follow all above constraints strictly.\n"
        "Ensure all instructions are adhered to without deviation."
    )

    return prompt + reinforcement
