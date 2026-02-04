from typing import Any, Dict

from psychographics.mft.schema import MFTScore


class MFTScorer:
    def score(self, text: str, context: dict[str, Any] = None) -> MFTScore:
        # Deterministic stub for now.
        # Check context for prompt sensitivity hooks?

        # Simple keyword matching for stub behavior
        care = 1.0 if "care" in text.lower() else 0.0
        fairness = 1.0 if "fair" in text.lower() else 0.0

        return MFTScore(
            care_harm=care,
            fairness_cheating=fairness,
            loyalty_betrayal=0.1,
            authority_subversion=0.1,
            sanctity_degradation=0.1,
            liberty_oppression=0.0
        )
