from __future__ import annotations

from dataclasses import dataclass
from typing import List

from fastapi import FastAPI, HTTPException
from features import build_degree_features
from pydantic import BaseModel, field_validator

from federated_attribution import (
    AttributionExplanation,
    AttributionFactor,
    AttributionLink,
    DomainSnapshot,
    FederatedAttributionEngine,
    ModelDesign,
    ObservedBehavior,
    PrivacyTradeoff,
    ThreatScenario,
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


app = FastAPI()
engine = FederatedAttributionEngine()


class BehaviorEventModel(BaseModel):
    actor_id: str
    target_id: str
    action: str
    timestamp: int
    risk: float
    privacy_tags: list[str] = []
    domain_id: str

    @field_validator("risk")
    @classmethod
    def _validate_risk(cls, value: float) -> float:
        if not 0.0 <= value <= 1.0:
            raise ValueError("risk must be between 0 and 1")
        return value

    def to_observed(self) -> ObservedBehavior:
        return ObservedBehavior(
            actor_id=self.actor_id,
            target_id=self.target_id,
            action=self.action,
            timestamp=self.timestamp,
            risk=self.risk,
            privacy_tags=frozenset(self.privacy_tags),
            domain_id=self.domain_id,
        )


class DomainSnapshotModel(BaseModel):
    domain_id: str
    classification: str
    sensitivity_tier: int
    controls: list[str] = []
    behaviors: list[BehaviorEventModel]

    @field_validator("sensitivity_tier")
    @classmethod
    def _validate_tier(cls, value: int) -> int:
        if value < 1 or value > 5:
            raise ValueError("sensitivity_tier must be between 1 and 5")
        return value

    def to_snapshot(self) -> DomainSnapshot:
        return DomainSnapshot(
            domain_id=self.domain_id,
            classification=self.classification,
            sensitivity_tier=self.sensitivity_tier,
            controls=self.controls,
            behaviors=tuple(behavior.to_observed() for behavior in self.behaviors),
        )


class FederationRequest(BaseModel):
    snapshots: list[DomainSnapshotModel]


class AttributionLinkModel(BaseModel):
    source: str
    target: str
    confidence: float
    domains: list[str]
    narrative: str
    privacy_delta: float

    @classmethod
    def from_domain(cls, link: AttributionLink) -> "AttributionLinkModel":
        return cls(
            source=link.source,
            target=link.target,
            confidence=link.confidence,
            domains=list(link.domains),
            narrative=link.narrative,
            privacy_delta=link.privacy_delta,
        )


class FederationResponse(BaseModel):
    total_entities: int
    cross_domain_links: list[AttributionLinkModel]
    privacy_delta: float
    pamag_score: float


class ThreatScenarioModel(BaseModel):
    actor: str
    pattern: str
    severity: str
    detection_confidence: float
    recommended_actions: list[str]

    @classmethod
    def from_domain(cls, scenario: ThreatScenario) -> "ThreatScenarioModel":
        return cls(
            actor=scenario.actor,
            pattern=scenario.pattern,
            severity=scenario.severity,
            detection_confidence=scenario.detection_confidence,
            recommended_actions=list(scenario.recommended_actions),
        )


class PrivacyTradeoffModel(BaseModel):
    privacy_score: float
    utility_score: float
    tradeoff_index: float
    rationale: str

    @classmethod
    def from_domain(cls, tradeoff: PrivacyTradeoff) -> "PrivacyTradeoffModel":
        return cls(
            privacy_score=tradeoff.privacy_score,
            utility_score=tradeoff.utility_score,
            tradeoff_index=tradeoff.tradeoff_index,
            rationale=tradeoff.rationale,
        )


class ModelDesignModel(BaseModel):
    name: str
    novelty: str
    claims: list[str]

    @classmethod
    def from_domain(cls, design: ModelDesign) -> "ModelDesignModel":
        return cls(name=design.name, novelty=design.novelty, claims=list(design.claims))


class AnalysisResponse(BaseModel):
    tradeoff: PrivacyTradeoffModel
    threat_scenarios: list[ThreatScenarioModel]
    model_design: ModelDesignModel


class AttributionFactorModel(BaseModel):
    label: str
    weight: float

    @classmethod
    def from_domain(cls, factor: AttributionFactor) -> "AttributionFactorModel":
        return cls(label=factor.label, weight=factor.weight)


class ExplanationRequest(BaseModel):
    entity_id: str


class ExplanationResponse(BaseModel):
    focus: str
    domains: list[str]
    top_factors: list[AttributionFactorModel]
    residual_risk: float
    supporting_links: list[AttributionLinkModel]

    @classmethod
    def from_domain(cls, explanation: AttributionExplanation) -> "ExplanationResponse":
        return cls(
            focus=explanation.focus,
            domains=list(explanation.domains),
            top_factors=[AttributionFactorModel.from_domain(factor) for factor in explanation.top_factors],
            residual_risk=explanation.residual_risk,
            supporting_links=[AttributionLinkModel.from_domain(link) for link in explanation.supporting_links],
        )


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


@app.post("/attribution/federate", response_model=FederationResponse)
def federate(request: FederationRequest) -> FederationResponse:
    for snapshot in request.snapshots:
        engine.ingest(snapshot.to_snapshot())
    total_entities, links, privacy_delta, pamag_score = engine.summarize()
    return FederationResponse(
        total_entities=total_entities,
        cross_domain_links=[AttributionLinkModel.from_domain(link) for link in links],
        privacy_delta=privacy_delta,
        pamag_score=pamag_score,
    )


@app.get("/attribution/analysis", response_model=AnalysisResponse)
def analyze() -> AnalysisResponse:
    tradeoff = engine.evaluate_tradeoff()
    scenarios = engine.simulate_adversaries()
    design = engine.describe_model_design()
    return AnalysisResponse(
        tradeoff=PrivacyTradeoffModel.from_domain(tradeoff),
        threat_scenarios=[ThreatScenarioModel.from_domain(scenario) for scenario in scenarios],
        model_design=ModelDesignModel.from_domain(design),
    )


@app.post("/attribution/explain", response_model=ExplanationResponse)
def explain(request: ExplanationRequest) -> ExplanationResponse:
    explanation = engine.explain(request.entity_id)
    return ExplanationResponse.from_domain(explanation)
