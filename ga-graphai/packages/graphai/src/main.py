from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from features import build_degree_features
from analytics import analyze_graph


class FeatureBuildRequest(BaseModel):
    edges: list[tuple[str, str]]


class Feature(BaseModel):
    node: str
    degree: int


class FeatureBuildResponse(BaseModel):
    features: list[Feature]


class GraphNode(BaseModel):
    id: str
    label: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class GraphEdge(BaseModel):
    source: str
    target: str
    weight: float | None = None
    timestamp: str | float | None = None
    label: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class CustomAlgorithm(BaseModel):
    name: str
    algorithm: str
    parameters: dict[str, Any] = Field(default_factory=dict)


class PatternInsights(BaseModel):
    triangles: list[list[str]]
    cycles: list[list[str]]
    hubs: list[str]


class CentralityInsights(BaseModel):
    degree: dict[str, float]
    betweenness: dict[str, float]
    closeness: dict[str, float]
    eigenvector: dict[str, float]
    top_hubs: list[str]


class CommunityInsights(BaseModel):
    communities: list[list[str]]
    modularity: float | None


class TemporalInsights(BaseModel):
    start: str | None
    end: str | None
    activity_by_day: dict[str, int]
    recency_by_node: dict[str, str]


class CustomAlgorithmResult(BaseModel):
    name: str
    algorithm: str
    result: dict[str, Any]


class VisualizationNode(BaseModel):
    id: str
    x: float
    y: float
    degree: int
    betweenness: float
    community: int | None = None


class Visualization(BaseModel):
    nodes: list[VisualizationNode]
    edges: list[dict[str, Any]]


class GraphAnalysisRequest(BaseModel):
    nodes: list[GraphNode] | None = None
    edges: list[GraphEdge]
    custom_algorithms: list[CustomAlgorithm] = Field(default_factory=list)


class GraphAnalysisResponse(BaseModel):
    patterns: PatternInsights
    centrality: CentralityInsights
    communities: CommunityInsights
    temporal: TemporalInsights
    custom_algorithms: list[CustomAlgorithmResult]
    visualization: Visualization


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


app = FastAPI()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/feature/build", response_model=FeatureBuildResponse)
def feature_build(req: FeatureBuildRequest) -> FeatureBuildResponse:
    data = build_degree_features(req.edges)
    features = [Feature(node=n, degree=d) for n, d in data.items()]
    return FeatureBuildResponse(features=features)


@app.post("/graph/analyze", response_model=GraphAnalysisResponse)
def graph_analyze(req: GraphAnalysisRequest) -> GraphAnalysisResponse:
    analysis = analyze_graph(
        [node.model_dump() for node in req.nodes] if req.nodes else None,
        [edge.model_dump() for edge in req.edges],
        [algo.model_dump() for algo in req.custom_algorithms],
    )
    return GraphAnalysisResponse(**analysis)


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
