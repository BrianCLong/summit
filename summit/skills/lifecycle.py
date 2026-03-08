"""
Skill Lifecycle Governance Module
Manages state transitions (experimental -> staged -> production -> deprecated).
"""
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, Optional


class SkillState(str, Enum):
    EXPERIMENTAL = "experimental"
    STAGED = "staged"
    PRODUCTION = "production"
    DEPRECATED = "deprecated"

@dataclass
class SkillLineage:
    proposer_agent: str
    tmaml_episode_hash: str
    evaluation_scores: dict[str, float]
    human_review_notes: Optional[str] = None

@dataclass
class GovernedSkill:
    id: str
    state: SkillState
    lineage: SkillLineage
    allowed_tenants: list[str]
    allowed_domains: list[str]

class SkillPromoter:
    def evaluate_for_promotion(self, skill: GovernedSkill, evaluation_results: dict[str, Any]) -> GovernedSkill:
        """
        Promotes an experimental skill if AEGS thresholds are met.
        High-risk domains require human approval.
        """
        score = evaluation_results.get("aggregate_score", 0.0)

        if skill.state == SkillState.EXPERIMENTAL:
            if score >= 0.8:
                if "infra-changing" in skill.allowed_domains:
                    if skill.lineage.human_review_notes:
                        skill.state = SkillState.STAGED
                    else:
                        print("Human review required for infra-changing domain.")
                else:
                    skill.state = SkillState.STAGED

        elif skill.state == SkillState.STAGED:
             if score >= 0.95:
                 skill.state = SkillState.PRODUCTION

        return skill

    def enforce_governance(self, skill: GovernedSkill, current_tenant: str, current_domain: str) -> bool:
        """
        Integrates governance rules so only approved skills can be called in specific environments.
        """
        if current_tenant not in skill.allowed_tenants and "*" not in skill.allowed_tenants:
            return False
        if current_domain not in skill.allowed_domains:
            return False
        if skill.state not in [SkillState.PRODUCTION, SkillState.STAGED]:
            return False
        return True
