from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field
from summit.persona.playbooks import StepType, PlaybookStep, PlaybookPhases, PersonaCampaignPlaybookTemplate, load_all_templates
import os

class PlatformAccount(BaseModel):
    platform: str
    account_id: str
    username: str

class PersonaHypothesis(BaseModel):
    persona_id: str
    risk_level: str = "LOW"
    deception_profile: str = "LOW"
    platform_accounts: List[PlatformAccount] = Field(default_factory=list)

class CampaignContext(BaseModel):
    campaign_id: str
    narrative_type: str

class PlaybookInstanceStep(PlaybookStep):
    status: str = "PLANNED"  # PLANNED, IN_PROGRESS, DONE

class PlaybookInstancePhases(BaseModel):
    OBSERVE: List[PlaybookInstanceStep] = Field(default_factory=list)
    ORIENT: List[PlaybookInstanceStep] = Field(default_factory=list)
    DECIDE: List[PlaybookInstanceStep] = Field(default_factory=list)
    ACT: List[PlaybookInstanceStep] = Field(default_factory=list)

class PersonaCampaignPlaybookInstance(BaseModel):
    instance_id: str
    persona_id: str
    campaign_id: Optional[str] = None
    template_id: str
    name: str
    description: str
    objectives: List[str]
    phases: PlaybookInstancePhases
    urgency: str  # LOW, MEDIUM, HIGH, CRITICAL
    complexity: str # LOW, MEDIUM, HIGH
    automation_coverage: float # 0.0 to 1.0
    role_assignments: Dict[str, str] = Field(default_factory=dict)

def _match_template(
    template: PersonaCampaignPlaybookTemplate,
    persona: PersonaHypothesis,
    campaign: Optional[CampaignContext] = None
) -> int:
    """Returns a score > 0 if the template matches the persona/campaign, else 0."""
    score = 0
    cond = template.applicability_conditions

    # Match Persona Attributes
    if "risk_level" in cond.persona_attributes:
        if persona.risk_level != cond.persona_attributes["risk_level"]:
            return 0
        score += 10

    if "deception_profile" in cond.persona_attributes:
        if persona.deception_profile != cond.persona_attributes["deception_profile"]:
            return 0
        score += 10

    if "platform_spread" in cond.persona_attributes:
        required_platforms = set(cond.persona_attributes["platform_spread"])
        actual_platforms = set(acc.platform for acc in persona.platform_accounts)
        if not required_platforms.issubset(actual_platforms):
            return 0
        score += 5

    # Match Campaign Attributes
    if "narrative_type" in cond.campaign_attributes:
        if not campaign or campaign.narrative_type != cond.campaign_attributes["narrative_type"]:
            return 0
        score += 15

    # If conditions were empty, give it a base score so it matches but isn't highly ranked.
    if score == 0 and not cond.persona_attributes and not cond.campaign_attributes:
        return 1

    return score

def _instantiate_phases(phases: PlaybookPhases) -> PlaybookInstancePhases:
    # Added to fix syntax error if there is one(phases: PlaybookPhases) -> PlaybookInstancePhases:
    return PlaybookInstancePhases(
        OBSERVE=[PlaybookInstanceStep(**step.model_dump()) for step in phases.OBSERVE],
        ORIENT=[PlaybookInstanceStep(**step.model_dump()) for step in phases.ORIENT],
        DECIDE=[PlaybookInstanceStep(**step.model_dump()) for step in phases.DECIDE],
        ACT=[PlaybookInstanceStep(**step.model_dump()) for step in phases.ACT],
    )

def _calculate_scores(instance_phases: PlaybookInstancePhases, persona_risk: str) -> tuple[str, str, float]:
    all_steps = (
        instance_phases.OBSERVE +
        instance_phases.ORIENT +
        instance_phases.DECIDE +
        instance_phases.ACT
    )
    total_steps = len(all_steps)
    if total_steps == 0:
        return ("LOW", "LOW", 0.0)

    # Automation Coverage
    auto_steps = sum(1 for step in all_steps if step.step_type == StepType.SAFE_AUTOMATION)
    automation_coverage = auto_steps / total_steps

    # Complexity
    if total_steps > 10:
        complexity = "HIGH"
    elif total_steps > 5:
        complexity = "MEDIUM"
    else:
        complexity = "LOW"

    # Urgency (Derived from persona risk level)
    urgency_map = {"CRITICAL": "CRITICAL", "HIGH": "HIGH", "MEDIUM": "MEDIUM", "LOW": "LOW"}
    urgency = urgency_map.get(persona_risk, "LOW")

    return urgency, complexity, automation_coverage

class PlaybookEngine:
    def __init__(self, templates_dir: Optional[str] = None):
        if templates_dir is None:
            templates_dir = os.path.join(os.path.dirname(__file__), "playbooks_templates")
        self.templates = load_all_templates(templates_dir)

    def plan_playbooks_for_persona(
        self,
        persona: PersonaHypothesis,
        campaign: Optional[CampaignContext] = None
    ) -> List[PersonaCampaignPlaybookInstance]:
        matches = []
        for template in self.templates:
            score = _match_template(template, persona, campaign)
            if score > 0:
                matches.append((score, template))

        # Sort by score descending
        matches.sort(key=lambda x: x[0], reverse=True)

        instances = []
        for _, template in matches:
            instance_phases = _instantiate_phases(template.phases)
            urgency, complexity, automation_coverage = _calculate_scores(instance_phases, persona.risk_level)

            instance = PersonaCampaignPlaybookInstance(
                instance_id=f"{template.playbook_id}_INSTANCE_{persona.persona_id}",
                persona_id=persona.persona_id,
                campaign_id=campaign.campaign_id if campaign else None,
                template_id=template.playbook_id,
                name=template.name,
                description=template.description,
                objectives=template.objectives,
                phases=instance_phases,
                urgency=urgency,
                complexity=complexity,
                automation_coverage=automation_coverage,
                role_assignments=template.role_assignments
            )
            instances.append(instance)

        return instances
