"""FastAPI entrypoint for the explainable entity-resolution service."""

from __future__ import annotations

import os
from datetime import datetime
from typing import Any

import numpy as np
import redis
from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool

from .blocking import RedisBlockingIndex
from .classifier import PairwiseClassifier, load_training_pairs
from .features import FeatureEngineer
from .models import (
    CandidatePair,
    CandidateRequest,
    CandidatesResponse,
    ExplainResponse,
    FeatureAttribution,
    MergeRequest,
    MergeResponse,
    MergeScorecard,
    SplitRequest,
    SplitResponse,
)
from .repository import DecisionRepository, MigrationManager

np.random.seed(42)

FEATURE_FLAG_KEY = "features.erService"
EXPLANATIONS: dict[str, dict[str, Any]] = {}
ADJUDICATION_QUEUE: list[str] = []


def _confidence_decay(confidence: float, created_at: datetime, half_life_days: float = 30.0) -> float:
    age_days = (datetime.utcnow() - created_at).total_seconds() / 86400
    factor = 0.5 ** (age_days / half_life_days)
    return float(confidence * factor)


def _make_pair_id(entity_id_a: str, entity_id_b: str) -> str:
    a, b = sorted([entity_id_a, entity_id_b])
    return f"{a}::{b}"


def _build_rationale(top_features: list[FeatureAttribution]) -> str:
    parts = [f"{item.feature}={item.value:.2f}" for item in top_features]
    return "Top signals: " + ", ".join(parts) if parts else "No strong features"


def _apply_overrides(
    features: dict[str, float],
    attributions: list[FeatureAttribution],
    weights: dict[str, float],
    overrides: dict[str, float] | None,
) -> list[FeatureAttribution]:
    if not overrides:
        return attributions
    adjusted: list[FeatureAttribution] = []
    for feature, value in features.items():
        weight = overrides.get(feature, weights.get(feature, 0.0))
        adjusted.append(
            FeatureAttribution(
                feature=feature,
                value=float(value),
                weight=float(weight),
                contribution=float(weight * value),
            )
        )
    adjusted.sort(key=lambda item: abs(item.contribution), reverse=True)
    return adjusted[: len(attributions)]


def build_redis_client() -> redis.Redis:
    url = os.getenv("ER_REDIS_URL")
    if url:
        return redis.Redis.from_url(url)
    try:
        import fakeredis

        return fakeredis.FakeRedis()
    except ModuleNotFoundError as exc:  # pragma: no cover - should not happen in tests
        raise RuntimeError("fakeredis is required for local testing") from exc


def build_engine():
    url = os.getenv("ER_DATABASE_URL")
    if url:
        return create_engine(url, future=True)
    return create_engine(
        "sqlite+pysqlite:///:memory:",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )


redis_client = build_redis_client()
blocking_index = RedisBlockingIndex(redis_client)
engine = build_engine()
repository = DecisionRepository(engine)
migrations = MigrationManager(engine)
migrations.apply()

feature_engineer = FeatureEngineer()
classifier = PairwiseClassifier(feature_engineer.FEATURE_ORDER)
training_pairs = load_training_pairs()
classifier.fit(training_pairs, feature_engineer)

app = FastAPI(title="Entity Resolution Service", version="1.0.0")


def get_repository() -> DecisionRepository:
    return repository


@app.post("/er/candidates", response_model=CandidatesResponse)
def generate_candidates(request: CandidateRequest) -> CandidatesResponse:
    entities = request.records
    blocking_result = blocking_index.generate(entities, request.threshold)

    candidates: list[CandidatePair] = []
    for entity_id_a, entity_id_b in blocking_result.pairs:
        entity_a = next(ent for ent in entities if ent.id == entity_id_a)
        entity_b = next(ent for ent in entities if ent.id == entity_id_b)
        features = feature_engineer.compute(entity_a, entity_b)
        score = classifier.predict_proba(features)
        attributions, weights = classifier.explain(features)
        pair_id = _make_pair_id(entity_id_a, entity_id_b)
        EXPLANATIONS[pair_id] = {
            "features": features,
            "weights": weights,
            "score": score,
            "human_overrides": None,
            "top_features": [item.model_dump() for item in attributions],
        }
        if score >= request.threshold:
            candidates.append(
                CandidatePair(
                    pair_id=pair_id,
                    entity_id_a=entity_id_a,
                    entity_id_b=entity_id_b,
                    score=score,
                    features=dict(features),
                    top_features=attributions,
                )
            )
        else:
            ADJUDICATION_QUEUE.append(pair_id)
    return CandidatesResponse(candidates=candidates, comparisons=blocking_result.comparisons)


@app.post("/er/merge", response_model=MergeResponse)
def merge_entities(request: MergeRequest, repo: DecisionRepository = Depends(get_repository)) -> MergeResponse:
    entity_ids = request.entity_ids
    base_pair_id = _make_pair_id(entity_ids[0], entity_ids[1])
    explanation = EXPLANATIONS.get(base_pair_id)
    if not explanation:
        raise HTTPException(status_code=404, detail="No candidate explanation available")

    overrides = request.human_overrides or {}
    adjusted_top = _apply_overrides(
        explanation["features"],
        [FeatureAttribution(**item) for item in explanation["top_features"]],
        explanation["weights"],
        overrides,
    )
    rationale = _build_rationale(adjusted_top)
    scorecard = MergeScorecard(pair_id=base_pair_id, score=explanation["score"], top_features=adjusted_top, rationale=rationale)

    now = datetime.utcnow()
    decayed = _confidence_decay(request.confidence, now)
    merge_id = repo.record_merge(
        entity_ids=entity_ids,
        policy=request.policy,
        scorecard=scorecard,
        confidence=request.confidence,
        decayed_confidence=decayed,
        human_overrides=overrides or None,
        actor=request.who,
    )
    explanation["human_overrides"] = overrides or None
    explanation["top_features"] = [item.model_dump() for item in adjusted_top]
    return MergeResponse(merge_id=merge_id, confidence=request.confidence, decayed_confidence=decayed, scorecard=scorecard)


@app.post("/er/split", response_model=SplitResponse)
def split_merge(request: SplitRequest, repo: DecisionRepository = Depends(get_repository)) -> SplitResponse:
    merge_record = repo.fetch_merge(request.merge_id)
    if not merge_record:
        raise HTTPException(status_code=404, detail="merge not found")
    repo.mark_split(request.merge_id, request.who, request.why)
    return SplitResponse(merge_id=request.merge_id, status="reversed")


@app.get("/er/explain", response_model=ExplainResponse)
def explain(pair_id: str) -> ExplainResponse:
    explanation = EXPLANATIONS.get(pair_id)
    if not explanation:
        raise HTTPException(status_code=404, detail="pair not found")
    top_features = [FeatureAttribution(**item) for item in explanation["top_features"]]
    return ExplainResponse(
        pair_id=pair_id,
        score=float(explanation["score"]),
        features={k: float(v) for k, v in explanation["features"].items()},
        weights={k: float(v) for k, v in explanation["weights"].items()},
        human_overrides=explanation.get("human_overrides"),
        top_features=top_features,
    )


@app.get("/er/audit")
def audit(repo: DecisionRepository = Depends(get_repository)):
    events = repo.list_audit_events()
    payload = []
    for event in events:
        record = event.model_dump()
        record["timestamp"] = event.timestamp.isoformat()
        payload.append(record)
    return JSONResponse(payload)


@app.get("/er/health")
def health() -> dict[str, Any]:
    mode = redis_client.connection_pool.connection_kwargs.get("host", "in-memory")
    return {
        "status": "ok",
        "feature_flag": FEATURE_FLAG_KEY,
        "model_version": classifier.model_version,
        "redis_mode": mode,
    }


__all__ = [
    "app",
    "blocking_index",
    "repository",
    "feature_engineer",
    "classifier",
    "generate_candidates",
    "merge_entities",
    "split_merge",
    "explain",
]
