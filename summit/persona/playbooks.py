import yaml
import os
from enum import Enum
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class StepType(str, Enum):
    HUMAN_ONLY = "HUMAN_ONLY"
    AGENT_ASSIST = "AGENT_ASSIST"
    SAFE_AUTOMATION = "SAFE_AUTOMATION"

class PlaybookStep(BaseModel):
    name: str
    description: str
    step_type: StepType
    dependencies: List[str] = Field(default_factory=list)
    suggested_integrations: List[str] = Field(default_factory=list)

class PlaybookPhases(BaseModel):
    OBSERVE: List[PlaybookStep] = Field(default_factory=list)
    ORIENT: List[PlaybookStep] = Field(default_factory=list)
    DECIDE: List[PlaybookStep] = Field(default_factory=list)
    ACT: List[PlaybookStep] = Field(default_factory=list)

class ApplicabilityConditions(BaseModel):
    persona_attributes: Dict[str, Any] = Field(default_factory=dict)
    campaign_attributes: Dict[str, Any] = Field(default_factory=dict)

class PersonaCampaignPlaybookTemplate(BaseModel):
    playbook_id: str
    name: str
    description: str
    applicability_conditions: ApplicabilityConditions
    objectives: List[str]
    phases: PlaybookPhases
    role_assignments: Dict[str, str] = Field(default_factory=dict)
    automation_suggestions: List[str] = Field(default_factory=list)

def load_template(filepath: str) -> PersonaCampaignPlaybookTemplate:
    with open(filepath, 'r') as f:
        data = yaml.safe_load(f)
    return PersonaCampaignPlaybookTemplate(**data)

def load_all_templates(directory: str) -> List[PersonaCampaignPlaybookTemplate]:
    templates = []
    if not os.path.exists(directory):
        return templates
    for filename in os.listdir(directory):
        if filename.endswith(".yaml") or filename.endswith(".yml"):
            filepath = os.path.join(directory, filename)
            templates.append(load_template(filepath))
    return templates
