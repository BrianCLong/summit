from typing import Optional
from .base import Hint, HintGenerator

class ReferenceHintGenerator(HintGenerator):
    """
    Generates hints by lossy compression of the reference solution (τ*).
    Level ℓ determines the amount of information revealed.
    """
    def generate(self, *, prompt: str, reference: Optional[str], level: int, seed: int) -> Hint:
        if not reference:
            return Hint(text="", level=level)

        # Level 0: No hint
        if level <= 0:
            return Hint(text="", level=0)

        # Level ℓ: Reveal first 5 * ℓ words of the reference
        # This simulates "prefix" hints or intermediate steps.
        # In a real SAGE impl, this might use a small model to summarize τ*.
        words = reference.split()
        num_words = min(len(words), level * 5)

        if num_words == 0:
            return Hint(text="", level=0)

        hint_text = " ".join(words[:num_words])
        if num_words < len(words):
            hint_text += "..."

        return Hint(text=hint_text, level=level)
