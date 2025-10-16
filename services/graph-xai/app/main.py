"""
Graph-XAI Service: Unified explainable AI for graph analytics
Consolidates all XAI functionality from scattered packages
"""

import hashlib
import os
from datetime import datetime, timedelta
from typing import Any

import redis
import structlog
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Configure structured logging
logger = structlog.get_logger()

# Redis for caching explanations
redis_client = redis.Redis.from_url(
    os.getenv("REDIS_URL", "redis://localhost:6379"), decode_responses=True
)

app = FastAPI(
    title="Graph-XAI Service",
    description="Unified explainable AI for graph analytics with caching and model cards",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response Models
class ExplainEntityRequest(BaseModel):
    entityId: str
    model: str = Field(..., description="Model name (e.g., 'gnn-v1', 'transformer-v2')")
    version: str = Field(..., description="Model version")
    locale: str | None = Field("en", description="Language for explanations")


class ExplainEdgeRequest(BaseModel):
    edgeId: str
    model: str
    version: str
    locale: str | None = "en"


class CounterfactualRequest(BaseModel):
    entityId: str | None = None
    edgeId: str | None = None
    model: str
    version: str
    constraints: dict[str, Any] | None = None


class Explanation(BaseModel):
    id: str
    subject_type: str  # "entity" or "edge"
    subject_id: str
    model: str
    version: str
    rationale: str
    counterfactuals: list[str]
    fairness_score: float | None = None
    robustness_score: float | None = None
    confidence: float
    created_at: datetime
    cache_ttl: int


class ModelCard(BaseModel):
    model: str
    version: str
    dataset: str
    training_date: datetime
    metrics: dict[str, float]
    fairness_tests: dict[str, Any]
    robustness_tests: dict[str, Any]


# Cache utilities
def get_cache_key(subject_id: str, model: str, version: str, locale: str) -> str:
    """Generate cache key for explanation"""
    return f"xai:{hashlib.md5(f'{subject_id}:{model}:{version}:{locale}'.encode()).hexdigest()}"


def get_cached_explanation(cache_key: str) -> Explanation | None:
    """Retrieve cached explanation"""
    try:
        data = redis_client.get(cache_key)
        if data:
            return Explanation.model_validate_json(data)
    except Exception as e:
        logger.warning("Cache retrieval failed", error=str(e))
    return None


def cache_explanation(cache_key: str, explanation: Explanation, ttl: int = 3600):
    """Cache explanation with TTL"""
    try:
        redis_client.setex(cache_key, ttl, explanation.model_dump_json())
    except Exception as e:
        logger.warning("Cache storage failed", error=str(e))


# Mock XAI engines (replace with actual implementations)
class GraphXAIEngine:
    @staticmethod
    def explain_entity(entity_id: str, model: str, version: str) -> dict[str, Any]:
        """Mock entity explanation - replace with actual GNN/transformer logic"""
        return {
            "rationale": f"Entity {entity_id} classified based on neighborhood patterns and feature importance from {model}:{version}",
            "counterfactuals": [
                f"If entity {entity_id} had different connection patterns to high-risk entities",
                f"If entity {entity_id} attributes were modified (confidence threshold variations)",
            ],
            "fairness_score": 0.85,
            "robustness_score": 0.78,
            "confidence": 0.92,
            "feature_importance": {
                "node_degree": 0.34,
                "clustering_coefficient": 0.28,
                "betweenness_centrality": 0.23,
                "attribute_similarity": 0.15,
            },
        }

    @staticmethod
    def explain_edge(edge_id: str, model: str, version: str) -> dict[str, Any]:
        """Mock edge explanation"""
        return {
            "rationale": f"Edge {edge_id} prediction based on structural features and temporal patterns",
            "counterfactuals": [
                f"If edge {edge_id} had different timing patterns",
                "If connected nodes had different attribute profiles",
            ],
            "fairness_score": 0.89,
            "robustness_score": 0.82,
            "confidence": 0.88,
        }


# Policy enforcement
def get_policy_context(request: Request) -> dict[str, str]:
    """Extract policy context from headers"""
    return {
        "authority_id": request.headers.get("x-authority-id"),
        "reason_for_access": request.headers.get("x-reason-for-access"),
    }


def enforce_policy(policy_context: dict[str, str] = Depends(get_policy_context)):
    """Enforce policy requirements"""
    if not policy_context.get("authority_id") or not policy_context.get("reason_for_access"):
        # Check if we're in dry-run mode
        if os.getenv("POLICY_DRY_RUN") == "true":
            logger.warning("Policy violation in dry-run mode", context=policy_context)
            return policy_context
        raise HTTPException(
            status_code=403,
            detail={
                "error": "Policy denial",
                "reason": "Missing authority binding or reason-for-access",
                "appeal_path": "/ombudsman/appeals",
            },
        )
    return policy_context


# Health check
@app.get("/health")
async def health_check():
    """Service health check"""
    try:
        # Test Redis connection
        redis_client.ping()
        redis_status = "healthy"
    except:
        redis_status = "unhealthy"

    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "dependencies": {"redis": redis_status},
    }


# XAI Endpoints
@app.post("/explain/entity", response_model=Explanation)
async def explain_entity(
    request: ExplainEntityRequest, policy: dict[str, str] = Depends(enforce_policy)
):
    """Generate explanation for graph entity"""

    # Check cache first
    cache_key = get_cache_key(request.entityId, request.model, request.version, request.locale)
    cached = get_cached_explanation(cache_key)
    if cached:
        logger.info("Cache hit for entity explanation", entity_id=request.entityId)
        return cached

    try:
        # Generate explanation using XAI engine
        result = GraphXAIEngine.explain_entity(request.entityId, request.model, request.version)

        explanation = Explanation(
            id=f"exp_{cache_key}",
            subject_type="entity",
            subject_id=request.entityId,
            model=request.model,
            version=request.version,
            rationale=result["rationale"],
            counterfactuals=result["counterfactuals"],
            fairness_score=result.get("fairness_score"),
            robustness_score=result.get("robustness_score"),
            confidence=result["confidence"],
            created_at=datetime.now(),
            cache_ttl=int(os.getenv("MODEL_CACHE_TTL", "3600")),
        )

        # Cache the explanation
        cache_explanation(cache_key, explanation, explanation.cache_ttl)

        logger.info(
            "Generated entity explanation",
            entity_id=request.entityId,
            model=request.model,
            authority=policy.get("authority_id"),
        )

        return explanation

    except Exception as e:
        logger.error(
            "Failed to generate entity explanation", entity_id=request.entityId, error=str(e)
        )
        raise HTTPException(status_code=500, detail=f"XAI generation failed: {str(e)}")


@app.post("/explain/edge", response_model=Explanation)
async def explain_edge(
    request: ExplainEdgeRequest, policy: dict[str, str] = Depends(enforce_policy)
):
    """Generate explanation for graph edge/relationship"""

    cache_key = get_cache_key(request.edgeId, request.model, request.version, request.locale)
    cached = get_cached_explanation(cache_key)
    if cached:
        return cached

    try:
        result = GraphXAIEngine.explain_edge(request.edgeId, request.model, request.version)

        explanation = Explanation(
            id=f"exp_{cache_key}",
            subject_type="edge",
            subject_id=request.edgeId,
            model=request.model,
            version=request.version,
            rationale=result["rationale"],
            counterfactuals=result["counterfactuals"],
            fairness_score=result.get("fairness_score"),
            robustness_score=result.get("robustness_score"),
            confidence=result["confidence"],
            created_at=datetime.now(),
            cache_ttl=int(os.getenv("MODEL_CACHE_TTL", "3600")),
        )

        cache_explanation(cache_key, explanation, explanation.cache_ttl)

        logger.info(
            "Generated edge explanation",
            edge_id=request.edgeId,
            authority=policy.get("authority_id"),
        )

        return explanation

    except Exception as e:
        logger.error("Failed to generate edge explanation", error=str(e))
        raise HTTPException(status_code=500, detail=f"XAI generation failed: {str(e)}")


@app.post("/counterfactuals")
async def generate_counterfactuals(
    request: CounterfactualRequest, policy: dict[str, str] = Depends(enforce_policy)
):
    """Generate counterfactual scenarios"""

    subject_id = request.entityId or request.edgeId
    if not subject_id:
        raise HTTPException(status_code=400, detail="Must specify either entityId or edgeId")

    try:
        # Mock counterfactual generation
        counterfactuals = [
            f"Scenario 1: Modified feature X for {subject_id}",
            f"Scenario 2: Different neighborhood structure for {subject_id}",
            f"Scenario 3: Alternative temporal patterns for {subject_id}",
        ]

        return {
            "subject_id": subject_id,
            "model": request.model,
            "version": request.version,
            "counterfactuals": counterfactuals,
            "constraints_applied": request.constraints or {},
            "generated_at": datetime.now().isoformat(),
        }

    except Exception as e:
        logger.error("Failed to generate counterfactuals", error=str(e))
        raise HTTPException(status_code=500, detail=f"Counterfactual generation failed: {str(e)}")


@app.get("/fairness/{model}/{version}")
async def get_fairness_metrics(
    model: str, version: str, policy: dict[str, str] = Depends(enforce_policy)
):
    """Get fairness assessment for model version"""

    # Mock fairness metrics
    return {
        "model": model,
        "version": version,
        "fairness_metrics": {
            "demographic_parity": 0.85,
            "equalized_odds": 0.82,
            "individual_fairness": 0.78,
        },
        "bias_tests": {"gender_bias": "PASS", "racial_bias": "PASS", "age_bias": "WARNING"},
        "assessed_at": datetime.now().isoformat(),
    }


@app.get("/robustness/{model}/{version}")
async def get_robustness_metrics(
    model: str, version: str, policy: dict[str, str] = Depends(enforce_policy)
):
    """Get robustness assessment for model version"""

    # Mock robustness metrics
    return {
        "model": model,
        "version": version,
        "robustness_metrics": {
            "adversarial_accuracy": 0.73,
            "noise_tolerance": 0.81,
            "input_stability": 0.85,
        },
        "stress_tests": {
            "node_removal": "PASS",
            "edge_perturbation": "PASS",
            "feature_noise": "WARNING",
        },
        "assessed_at": datetime.now().isoformat(),
    }


@app.get("/models/{model}/card", response_model=ModelCard)
async def get_model_card(
    model: str, version: str | None = "latest", policy: dict[str, str] = Depends(enforce_policy)
):
    """Get model card with training metadata and assessments"""

    # Mock model card
    return ModelCard(
        model=model,
        version=version,
        dataset="graph_dataset_v2.1",
        training_date=datetime.now() - timedelta(days=30),
        metrics={"accuracy": 0.89, "precision": 0.87, "recall": 0.85, "f1_score": 0.86},
        fairness_tests={"demographic_parity": 0.85, "equalized_odds": 0.82},
        robustness_tests={"adversarial_accuracy": 0.73, "noise_tolerance": 0.81},
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "4011")),
        reload=True if os.getenv("NODE_ENV") == "development" else False,
    )
