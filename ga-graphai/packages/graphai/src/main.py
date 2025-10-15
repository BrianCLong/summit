from __future__ import annotations

from dataclasses import dataclass
from typing import List

from fastapi import FastAPI, HTTPException
from features import build_degree_features
from pydantic import BaseModel

from privacy import noisy_degree_counts


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
    capabilities: List[str]
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


class SecureDegreeQuery(BaseModel):
    edges: list[tuple[str, str]]
    targets: list[str] | None = None
    epsilon: float
    sensitivity: float = 1.0
    seed: int | None = None


class SanitizedDegree(BaseModel):
    node: str
    noisy_degree: float


class PrivacyMetadata(BaseModel):
    epsilon: float
    sensitivity: float
    noise_scale: float
    composition_cost: float
    audit_proof: str


class SecureDegreeResponse(BaseModel):
    results: list[SanitizedDegree]
    metadata: PrivacyMetadata


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


@app.post("/query/privacy/degree", response_model=SecureDegreeResponse)
def secure_degree_query(payload: SecureDegreeQuery) -> SecureDegreeResponse:
    try:
        sanitized, metadata = noisy_degree_counts(
            edges=payload.edges,
            epsilon=payload.epsilon,
            sensitivity=payload.sensitivity,
            targets=payload.targets,
            seed=payload.seed,
        )
    except ValueError as exc:  # pragma: no cover - defensive guard
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    results = [
        SanitizedDegree(node=node, noisy_degree=value)
        for node, value in sanitized
    ]
    meta = PrivacyMetadata(
        epsilon=payload.epsilon,
        sensitivity=payload.sensitivity,
        noise_scale=metadata["noise_scale"],
        composition_cost=metadata["composition_cost"],
        audit_proof=metadata["audit_proof"],
    )
    return SecureDegreeResponse(results=results, metadata=meta)
