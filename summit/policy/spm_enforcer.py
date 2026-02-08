import logging
from typing import List, Optional
from .router import PolicyDecision

logger = logging.getLogger(__name__)

class SPMEnforcer:
    """
    Enforces Skill Preserving Mode (SPM) by providing prompt augmentations.
    """

    SPM_PLAN_AUGMENTATION = (
        "You are in Skill Preserving Mode. Before executing any task, you must ask the user for their proposed plan. "
        "Provide conceptual guidance and avoid direct code generation unless the user's plan is verified."
    )

    SPM_EXPLANATION_AUGMENTATION = (
        "Explain the 'why' behind your suggestions to ensure the user maintains mastery of the domain."
    )

    def get_prompt_augmentations(self, decision: PolicyDecision) -> List[str]:
        """
        Returns a list of prompt augmentations based on the policy decision.
        """
        if decision.mode != "skill_preserving":
            logger.debug("Baseline mode: no SPM augmentations added.")
            return []

        logger.info("SPM mode active: adding prompt augmentations.")
        return [
            self.SPM_PLAN_AUGMENTATION,
            self.SPM_EXPLANATION_AUGMENTATION
        ]

    def wrap_system_prompt(self, system_prompt: str, decision: PolicyDecision) -> str:
        """
        Convenience method to wrap a system prompt with SPM instructions.
        """
        augmentations = self.get_prompt_augmentations(decision)
        if not augmentations:
            return system_prompt

        header = "\n\n=== SKILL PRESERVING MODE ENABLED ===\n"
        body = "\n".join(f"- {a}" for a in augmentations)
        footer = "\n====================================\n"

        return f"{system_prompt}{header}{body}{footer}"
