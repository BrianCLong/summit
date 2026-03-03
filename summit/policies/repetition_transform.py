def reinforce_constraints(prompt: str) -> str:
    """Applies a deterministic constraint reinforcement block."""
    return prompt + "\n\n[CONSTRAINT REMINDER BLOCK]\nFollow all above constraints strictly."
