from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import networkx as nx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from analytics import (
    NarrativeObservation,
    aggregate_narrative_observations,
    detect_distribution_shift,
    fluid_diffusion_communities,
    sentiment_risk_index,
)
from federation import (
    FederatedDataNode,
    FederatedQueryPlanner,
    FederatedQueryPlan,
    FederatedQueryRequest,
)
from features import build_degree_features
from foundation import (
    EvaluationWindow,
    GraphFoundationModelBenchmarker,
    GraphFoundationModelProfile,
)


class FeatureBuildRequest(BaseModel):
    edges: list[tuple[str, str]]


class Feature(BaseModel):
    node: str
    degree: int


class FeatureBuildResponse(BaseModel):
    features: list[Feature]


@dataclass(frozen=True)
class ModelProfile:
    name: str
    region: str
    latency_ms: int
    cost_per_1k_tokens: float
    capabilities: list[str]
    max_context: int
    tier: str


MODEL_REGISTRY: list[ModelProfile] = [
    ModelProfile(
        name="atlas-gpt-4",
        region="us-east-1",
        latency_ms=380,
        cost_per_1k_tokens=32.0,
        capabilities=["code", "reasoning", "analysis"],
        max_context=8000,
        tier="premium",
    ),
    ModelProfile(
        name="orion-claude-3",
        region="us-west-2",
        latency_ms=250,
        cost_per_1k_tokens=18.0,
        capabilities=["analysis", "summary", "moderation"],
        max_context=200000,
        tier="standard",
    ),
    ModelProfile(
        name="nebula-sonnet",
        region="eu-central-1",
        latency_ms=210,
        cost_per_1k_tokens=12.0,
        capabilities=["summary", "translation", "moderation"],
        max_context=32000,
        tier="regional",
    ),
]


class RouteRequest(BaseModel):
    action: str
    tenant_id: str
    user_id: str
    required_capabilities: list[str]
    region: str
    max_latency_ms: int | None = None
    max_cost_per_1k_tokens: float | None = None


class RouteDecision(BaseModel):
    model: str
    region: str
    latency_ms: int
    cost_per_1k_tokens: float
    reason: str


class FederatedNodeModel(BaseModel):
    node_id: str
    locality: str
    privacy_budget: float = Field(ge=0)
    sensitivity_ceiling: int = Field(ge=0)
    latency_penalty_ms: int = Field(ge=0)
    supported_capabilities: list[str]
    sovereign: bool = False


class FederatedQueryModel(BaseModel):
    query_id: str
    required_capabilities: list[str]
    sensitivity: int = Field(ge=0)
    preferred_localities: list[str] = Field(default_factory=list)
    privacy_budget: float = Field(default=1.0, ge=0)
    estimated_edges: int = Field(default=0, ge=0)


class FederatedPlanStepModel(BaseModel):
    node_id: str
    capability: str
    estimated_latency_ms: int
    privacy_cost: float
    rationale: str
    secure_aggregation: bool


class FederatedPlanResponse(BaseModel):
    query_id: str
    steps: list[FederatedPlanStepModel]
    residual_budget: float
    warnings: list[str]


class FederatedPlanRequest(BaseModel):
    nodes: list[FederatedNodeModel] = Field(default_factory=list)
    query: FederatedQueryModel


class NarrativeObservationModel(BaseModel):
    identification: float
    imitation: float
    amplification: float
    emotional_triggers: dict[str, float] = Field(default_factory=dict)


class NarrativeAnalysisResponse(BaseModel):
    identification: float
    imitation: float
    amplification: float
    emotional_triggers: dict[str, float]
    volatility: float
    sentiment_risk: float


class NarrativeAnalysisRequest(BaseModel):
    observations: list[NarrativeObservationModel] = Field(default_factory=list)


class DistributionShiftRequest(BaseModel):
    baseline: list[float]
    observed: list[float]
    threshold: float = Field(default=0.15, ge=0)


class DistributionShiftResponse(BaseModel):
    divergence: float
    breached: bool


class DiffusionRequest(BaseModel):
    nodes: list[str]
    edges: list[tuple[str, str]]
    damping: float = Field(default=0.85, ge=0, le=1)
    iterations: int = Field(default=20, ge=0)


class DiffusionResponse(BaseModel):
    weights: dict[str, float]


class EvaluationWindowModel(BaseModel):
    precision: float
    recall: float
    f1: float
    roc_auc: float


class BenchmarkRequest(BaseModel):
    model: str
    embedding_dim: int
    latency_ms: int
    max_nodes: int
    specialties: list[str] = Field(default_factory=list)
    baseline: list[EvaluationWindowModel]
    candidate: list[EvaluationWindowModel]


class BenchmarkResponse(BaseModel):
    baseline: EvaluationWindowModel
    candidate: EvaluationWindowModel
    lift_precision: float
    lift_recall: float
    lift_f1: float
    lift_roc_auc: float


app = FastAPI()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/feature/build", response_model=FeatureBuildResponse)
def feature_build(req: FeatureBuildRequest) -> FeatureBuildResponse:
    data = build_degree_features(req.edges)
    features = [Feature(node=n, degree=d) for n, d in data.items()]
    return FeatureBuildResponse(features=features)


def _score_model(candidate: ModelProfile, request: RouteRequest) -> float:
    latency_penalty = candidate.latency_ms / 100.0
    cost_penalty = candidate.cost_per_1k_tokens
    tier_modifier = {"premium": 5.0, "standard": 2.5, "regional": 1.5}.get(candidate.tier, 3.0)
    return latency_penalty + cost_penalty + tier_modifier


def _filter_models(request: RouteRequest) -> list[ModelProfile]:
    filtered: list[ModelProfile] = []
    for model in MODEL_REGISTRY:
        if request.region and model.region != request.region:
            continue
        if not set(request.required_capabilities).issubset(set(model.capabilities)):
            continue
        if request.max_latency_ms is not None and model.latency_ms > request.max_latency_ms:
            continue
        if (
            request.max_cost_per_1k_tokens is not None
            and model.cost_per_1k_tokens > request.max_cost_per_1k_tokens
        ):
            continue
        filtered.append(model)
    return filtered


@app.post("/router/route", response_model=RouteDecision)
def route_model(request: RouteRequest) -> RouteDecision:
    candidates = _filter_models(request)
    if not candidates:
        raise HTTPException(
            status_code=422,
            detail="No model satisfies the requested guardrails; consider widening constraints.",
        )

    best = min(candidates, key=lambda model: _score_model(model, request))
    reason = (
        f"Selected {best.name} in {best.region} with latency {best.latency_ms} ms and cost "
        f"${best.cost_per_1k_tokens} per 1K tokens"
    )
    return RouteDecision(
        model=best.name,
        region=best.region,
        latency_ms=best.latency_ms,
        cost_per_1k_tokens=best.cost_per_1k_tokens,
        reason=reason,
    )


@app.post("/federation/plan", response_model=FederatedPlanResponse)
def federated_plan(req: FederatedPlanRequest) -> FederatedPlanResponse:
    nodes_model = req.nodes
    query_model = req.query

    planner = FederatedQueryPlanner(
        nodes=[
            FederatedDataNode(
                node_id=node.node_id,
                locality=node.locality,
                privacy_budget=node.privacy_budget,
                sensitivity_ceiling=node.sensitivity_ceiling,
                latency_penalty_ms=node.latency_penalty_ms,
                supported_capabilities=tuple(node.supported_capabilities),
                sovereign=node.sovereign,
            )
            for node in nodes_model
        ]
    )

    plan: FederatedQueryPlan = planner.plan(
        FederatedQueryRequest(
            query_id=query_model.query_id,
            required_capabilities=tuple(query_model.required_capabilities),
            sensitivity=query_model.sensitivity,
            preferred_localities=tuple(query_model.preferred_localities),
            privacy_budget=query_model.privacy_budget,
            estimated_edges=query_model.estimated_edges,
        )
    )

    return FederatedPlanResponse(
        query_id=plan.query_id,
        residual_budget=plan.residual_budget,
        warnings=list(plan.warnings),
        steps=[
            FederatedPlanStepModel(
                node_id=step.node_id,
                capability=step.capability,
                estimated_latency_ms=step.estimated_latency_ms,
                privacy_cost=step.privacy_cost,
                rationale=step.rationale,
                secure_aggregation=step.secure_aggregation,
            )
            for step in plan.steps
        ],
    )


@app.post("/narratives/analyse", response_model=NarrativeAnalysisResponse)
def analyse_narratives(req: NarrativeAnalysisRequest) -> NarrativeAnalysisResponse:
    summary = aggregate_narrative_observations(
        NarrativeObservation(
            identification=item.identification,
            imitation=item.imitation,
            amplification=item.amplification,
            emotional_triggers=item.emotional_triggers,
        )
        for item in req.observations
    )
    sentiment = sentiment_risk_index(summary.emotional_triggers)
    return NarrativeAnalysisResponse(
        identification=summary.identification,
        imitation=summary.imitation,
        amplification=summary.amplification,
        emotional_triggers=dict(summary.emotional_triggers),
        volatility=summary.volatility,
        sentiment_risk=round(sentiment, 4),
    )


@app.post("/analytics/distribution-shift", response_model=DistributionShiftResponse)
def distribution_shift(req: DistributionShiftRequest) -> DistributionShiftResponse:
    divergence, breached = detect_distribution_shift(
        req.baseline, req.observed, threshold=req.threshold
    )
    return DistributionShiftResponse(divergence=round(divergence, 6), breached=breached)


@app.post("/analytics/diffusion", response_model=DiffusionResponse)
def diffusion(req: DiffusionRequest) -> DiffusionResponse:
    graph = nx.Graph()
    graph.add_nodes_from(req.nodes)
    graph.add_edges_from(req.edges)
    weights = fluid_diffusion_communities(graph, damping=req.damping, iterations=req.iterations)
    return DiffusionResponse(weights={node: round(weight, 6) for node, weight in weights.items()})


@app.post("/gfm/benchmark", response_model=BenchmarkResponse)
def gfm_benchmark(req: BenchmarkRequest) -> BenchmarkResponse:
    profile = GraphFoundationModelProfile(
        name=req.model,
        embedding_dim=req.embedding_dim,
        latency_ms=req.latency_ms,
        max_nodes=req.max_nodes,
        specialties=tuple(req.specialties),
    )
    benchmarker = GraphFoundationModelBenchmarker(profile)

    def to_window(model: EvaluationWindowModel) -> EvaluationWindow:
        return EvaluationWindow(
            precision=model.precision,
            recall=model.recall,
            f1=model.f1,
            roc_auc=model.roc_auc,
        )

    comparison = benchmarker.compare(
        baseline=[to_window(window) for window in req.baseline],
        candidate=[to_window(window) for window in req.candidate],
    )

    return BenchmarkResponse(
        baseline=EvaluationWindowModel(**comparison.baseline.__dict__),
        candidate=EvaluationWindowModel(**comparison.candidate.__dict__),
        lift_precision=comparison.lift_precision,
        lift_recall=comparison.lift_recall,
        lift_f1=comparison.lift_f1,
        lift_roc_auc=comparison.lift_roc_auc,
    )
