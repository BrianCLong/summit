from __future__ import annotations

from typing import Any, Dict, List


class SocietyOfThoughtPolicy:
    """
    Policy engine for Society of Thought debate.
    Enforces 'inevitable conflict' and 'reconciliation integrity'.
    """
    def __init__(self, min_challenges: int = 2):
        self.min_challenges = min_challenges

    def assert_ok(self, debate: list[dict[str, str]], user_input: str, context: dict[str, Any]):
        planner_turn = next((t for t in debate if t["persona"] == "Planner"), None)
        critic_turn = next((t for t in debate if t["persona"] == "CriticalVerifier"), None)
        reconciler_turn = next((t for t in debate if t["persona"] == "Reconciler"), None)

        if not planner_turn or not critic_turn or not reconciler_turn:
            raise ValueError("Incomplete debate: missing persona turns")

        # 1. Critic must produce at least N distinct challenges (bullets or numbered items)
        challenges = self._extract_challenges(critic_turn["text"])
        if len(challenges) < self.min_challenges:
            # Special case: if critic agreed, it must explain why falsification failed
            if "agree" in critic_turn["text"].lower() and "falsification" in critic_turn["text"].lower():
                pass # Acceptable if they tried to falsify
            else:
                raise ValueError(f"Sycophancy detected: Critic produced only {len(challenges)} challenges (minimum {self.min_challenges})")

        # 2. Reconciler must reference at least one critic challenge
        if not self._reconciler_addressed_critic(reconciler_turn["text"], challenges):
            raise ValueError("Audit failure: Reconciler did not address critic's specific points")

    def _extract_challenges(self, text: str) -> list[str]:
        # Simple heuristic: lines starting with - or * or numbers
        lines = text.splitlines()
        challenges = [l.strip() for l in lines if l.strip().startswith(('-', '*', '1.', '2.', '3.'))]
        return challenges

    def _reconciler_addressed_critic(self, reconciler_text: str, challenges: list[str]) -> bool:
        if not challenges:
            return True # Nothing to address

        reconciler_lower = reconciler_text.lower()
        # Look for keywords indicating reconciliation of critic points
        reconciliation_keywords = ["critique", "challenge", "flaw", "addressed", "resolved", "incorporated"]

        # At a minimum, must mention that a critique was considered
        return any(kw in reconciler_lower for kw in reconciliation_keywords)
