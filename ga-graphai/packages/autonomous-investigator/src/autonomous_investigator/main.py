"""FastAPI surface for the autonomous investigator engine."""

from __future__ import annotations

from fastapi import FastAPI
from pydantic import BaseModel, Field

from .domain import Hypothesis as DomainHypothesis
from .domain import Objective as DomainObjective
from .domain import Plan as DomainPlan
from .domain import Signal as DomainSignal
from .domain import Task as DomainTask
from .engine import InvestigatorEngine

app = FastAPI(title="Autonomous Investigator", version="0.1.0")
engine = InvestigatorEngine()


class ObjectiveModel(BaseModel):
    description: str
    priority: int = Field(ge=1, le=5)
    success_metric: str


class LeadModel(BaseModel):
    id: str
    description: str
    signal_type: str
    severity: float = Field(ge=0, le=1)
    confidence: float = Field(ge=0, le=1)


class InvestigationRequest(BaseModel):
    case_id: str
    objectives: list[ObjectiveModel]
    leads: list[LeadModel]
    resources: list[str] = Field(default_factory=list)
    risk_appetite: float = Field(ge=0, le=1, default=0.5)


class HypothesisModel(BaseModel):
    id: str
    summary: str
    probability: float
    novelty_score: float
    expected_impact: float
    supporting_signals: list[str]
    counterfactual_penalty: float


class TaskModel(BaseModel):
    id: str
    title: str
    action: str
    owning_agent: str
    dependencies: list[str] = Field(default_factory=list)
    innovation_vectors: list[str] = Field(default_factory=list)
    estimated_hours: float
    verification_metric: str


class InvestigationResponse(BaseModel):
    case_id: str
    hypotheses: list[HypothesisModel]
    tasks: list[TaskModel]
    differentiation_factors: list[str]
    counterfactual_branches: list[str]
    assurance_score: float


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def _to_domain_objective(model: ObjectiveModel) -> DomainObjective:
    return DomainObjective(
        description=model.description,
        priority=model.priority,
        success_metric=model.success_metric,
    )


def _to_domain_signal(model: LeadModel) -> DomainSignal:
    return DomainSignal(
        id=model.id,
        description=model.description,
        signal_type=model.signal_type,
        severity=model.severity,
        confidence=model.confidence,
    )


def _from_domain_hypothesis(domain: DomainHypothesis) -> HypothesisModel:
    return HypothesisModel(
        id=domain.id,
        summary=domain.summary,
        probability=domain.probability,
        novelty_score=domain.novelty_score,
        expected_impact=domain.expected_impact,
        supporting_signals=domain.supporting_signals,
        counterfactual_penalty=domain.counterfactual_penalty,
    )


def _from_domain_task(domain: DomainTask) -> TaskModel:
    return TaskModel(
        id=domain.id,
        title=domain.title,
        action=domain.action,
        owning_agent=domain.owning_agent,
        dependencies=domain.dependencies,
        innovation_vectors=domain.innovation_vectors,
        estimated_hours=domain.estimated_hours,
        verification_metric=domain.verification_metric,
    )


def _from_domain_plan(plan: DomainPlan) -> InvestigationResponse:
    return InvestigationResponse(
        case_id=plan.case_id,
        hypotheses=[_from_domain_hypothesis(hyp) for hyp in plan.hypotheses],
        tasks=[_from_domain_task(task) for task in plan.tasks],
        differentiation_factors=plan.differentiation_factors,
        counterfactual_branches=plan.counterfactual_branches,
        assurance_score=plan.assurance_score,
    )


@app.post("/investigator/plan", response_model=InvestigationResponse)
def build_plan(request: InvestigationRequest) -> InvestigationResponse:
    objectives = [_to_domain_objective(obj) for obj in request.objectives]
    signals = [_to_domain_signal(lead) for lead in request.leads]
    domain_plan = engine.build_plan(
        case_id=request.case_id,
        signals=signals,
        objectives=objectives,
        resources=request.resources,
        risk_appetite=request.risk_appetite,
    )
    return _from_domain_plan(domain_plan)
