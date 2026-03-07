from typing import Literal, Optional, List
from pydantic import BaseModel, Field

class EpistemicClaim(BaseModel):
    claim_id: str
    statement: str
    status: Literal['hypothesized', 'corroborated', 'refuted', 'deprecated']
    confidence: float = Field(ge=0.0, le=1.0)
    epistemic_uncertainty: float = Field(ge=0.0, le=1.0)
    aleatoric_uncertainty: float = Field(ge=0.0, le=1.0)
    domain: str
    support_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    conflict_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    created_by_agent_id: str
    subject_ref: str

class EpistemicEvidence(BaseModel):
    evidence_id: str
    source_type: str
    source_handle: Optional[str] = None
    snippet_hash: Optional[str] = None
    reliability_score: float = Field(ge=0.0, le=1.0)

class ProvenanceStep(BaseModel):
    step_id: str
    operation_type: str
    model_id: str
    model_version: Optional[str] = None
    pipeline_stage: Optional[str] = None

class EpistemicPolicy(BaseModel):
    policy_id: str
    min_support_score: float = Field(ge=0.0, le=1.0)
    max_epistemic_uncertainty: float = Field(ge=0.0, le=1.0)
    min_independent_sources: int = Field(ge=0)
    max_conflict_score: float = Field(ge=0.0, le=1.0)
    require_human_approval: Optional[bool] = False

class EpistemicDecision(BaseModel):
    decision_id: str
    claim_id: str
    policy_id: str
    decision: Literal['APPROVE', 'DEGRADE', 'BLOCK', 'ESCALATE']
    evidence_ids: List[str]
    rationale: Optional[str] = None
