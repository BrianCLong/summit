#!/usr/bin/env python3
"""
AI Insights MVP-0 Service
FastAPI + PyTorch service for entity resolution and link scoring
Designed for IntelGraph platform integration
"""

import logging
import os
import time
from contextlib import asynccontextmanager
from typing import Any

import numpy as np
import redis.asyncio as redis
import torch
import torch.nn as nn
import uvicorn
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from prometheus_client import Counter, Gauge, Histogram, generate_latest
from pydantic import BaseModel, Field
from starlette.responses import Response

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Prometheus metrics
REQUEST_COUNT = Counter(
    "ai_insights_requests_total", "Total AI insights requests", ["method", "endpoint"]
)
REQUEST_DURATION = Histogram("ai_insights_request_duration_seconds", "Request duration")
ENTITY_RESOLUTION_DURATION = Histogram(
    "entity_resolution_duration_seconds", "Entity resolution processing time"
)
LINK_SCORING_DURATION = Histogram("link_scoring_duration_seconds", "Link scoring processing time")
ACTIVE_MODELS = Gauge("ai_insights_active_models", "Number of loaded models")
CACHE_HITS = Counter("ai_insights_cache_hits_total", "Cache hits")
CACHE_MISSES = Counter("ai_insights_cache_misses_total", "Cache misses")

# Configuration
CONFIG = {
    "redis_url": os.getenv("REDIS_URL", "redis://localhost:6379"),
    "model_cache_ttl": int(os.getenv("MODEL_CACHE_TTL", "3600")),  # 1 hour
    "feature_flag_ai_scoring": os.getenv("FEATURE_FLAG_AI_SCORING", "true").lower() == "true",
    "batch_size": int(os.getenv("AI_BATCH_SIZE", "32")),
    "max_entities_per_request": int(os.getenv("MAX_ENTITIES_PER_REQUEST", "100")),
    "device": "cuda" if torch.cuda.is_available() else "cpu",
}


# Pydantic models
class Entity(BaseModel):
    id: str
    name: str
    type: str
    attributes: dict[str, Any] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)


class EntityPair(BaseModel):
    entity_a: Entity
    entity_b: Entity
    context: str | None = None


class EntityResolutionRequest(BaseModel):
    entities: list[Entity]
    threshold: float = Field(default=0.8, ge=0.0, le=1.0)
    include_features: bool = Field(default=False)


class LinkScoringRequest(BaseModel):
    entity_pairs: list[EntityPair]
    include_confidence: bool = Field(default=True)


class EntityMatch(BaseModel):
    entity_a_id: str
    entity_b_id: str
    confidence: float
    features: dict[str, float] | None = None
    method: str


class LinkScore(BaseModel):
    entity_a_id: str
    entity_b_id: str
    score: float
    confidence: float
    features: dict[str, float]


class EntityResolutionResponse(BaseModel):
    matches: list[EntityMatch]
    processing_time_ms: float
    model_version: str


class LinkScoringResponse(BaseModel):
    scores: list[LinkScore]
    processing_time_ms: float
    model_version: str


class HealthResponse(BaseModel):
    status: str
    models_loaded: int
    cache_status: str
    feature_flags: dict[str, bool]
    uptime_seconds: float


# Simple neural network for entity resolution
class EntityResolutionModel(nn.Module):
    def __init__(self, input_dim: int = 128, hidden_dim: int = 64):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.ReLU(),
            nn.Linear(hidden_dim // 2, 32),
        )
        self.similarity = nn.CosineSimilarity(dim=1)

    def forward(self, entity_a_features, entity_b_features):
        encoded_a = self.encoder(entity_a_features)
        encoded_b = self.encoder(entity_b_features)
        similarity = self.similarity(encoded_a, encoded_b)
        return similarity


# Link scoring model
class LinkScoringModel(nn.Module):
    def __init__(self, input_dim: int = 256):
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(input_dim, 128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid(),
        )

    def forward(self, combined_features):
        return self.network(combined_features).squeeze(-1)


# AI Service class
class AIInsightsService:
    def __init__(self):
        self.entity_model = None
        self.link_model = None
        self.redis_client = None
        self.start_time = time.time()
        self.model_version = "mvp-0.1.0"

    async def initialize(self):
        """Initialize models and connections"""
        logger.info("🚀 Initializing AI Insights Service...")

        # Initialize Redis
        self.redis_client = redis.from_url(CONFIG["redis_url"])
        await self.redis_client.ping()
        logger.info("✅ Redis connection established")

        # Load models
        await self.load_models()

        ACTIVE_MODELS.set(2)  # Entity resolution + Link scoring
        logger.info("✅ AI Insights Service initialized")

    async def load_models(self):
        """Load AI models"""
        logger.info("🧠 Loading AI models...")

        # Initialize entity resolution model
        self.entity_model = EntityResolutionModel()
        self.entity_model.eval()
        self.entity_model.to(CONFIG["device"])

        # Initialize link scoring model
        self.link_model = LinkScoringModel()
        self.link_model.eval()
        self.link_model.to(CONFIG["device"])

        # In production, load pre-trained weights
        # self.entity_model.load_state_dict(torch.load('entity_model.pth'))
        # self.link_model.load_state_dict(torch.load('link_model.pth'))

        logger.info("✅ Models loaded successfully")

    def extract_features(self, entity: Entity) -> np.ndarray:
        """Extract features from entity for ML processing"""
        # Simple feature extraction - in production, use more sophisticated methods
        features = []

        # Name features (simplified)
        name_length = len(entity.name)
        name_words = len(entity.name.split())
        features.extend([name_length / 100.0, name_words / 10.0])

        # Type features (one-hot encoded)
        entity_types = ["person", "organization", "location", "event", "other"]
        type_features = [1.0 if entity.type == t else 0.0 for t in entity_types]
        features.extend(type_features)

        # Attribute features
        attr_count = len(entity.attributes)
        features.append(attr_count / 20.0)

        # Pad or truncate to fixed size
        target_size = 128
        if len(features) < target_size:
            features.extend([0.0] * (target_size - len(features)))
        else:
            features = features[:target_size]

        return np.array(features, dtype=np.float32)

    async def resolve_entities(self, request: EntityResolutionRequest) -> EntityResolutionResponse:
        """Perform entity resolution"""
        start_time = time.time()

        with ENTITY_RESOLUTION_DURATION.time():
            matches = []

            # Check cache first
            cache_key = f"entity_resolution:{hash(str(sorted([e.id for e in request.entities])))}"
            cached_result = await self.redis_client.get(cache_key)

            if cached_result and not request.include_features:
                CACHE_HITS.inc()
                logger.info("🎯 Cache hit for entity resolution")
                import json

                cached_data = json.loads(cached_result)
                return EntityResolutionResponse(**cached_data)

            CACHE_MISSES.inc()

            # Extract features for all entities
            entity_features = {}
            for entity in request.entities:
                features = self.extract_features(entity)
                entity_features[entity.id] = torch.tensor(features).to(CONFIG["device"])

            # Compare all entity pairs
            entities_list = list(request.entities)
            for i in range(len(entities_list)):
                for j in range(i + 1, len(entities_list)):
                    entity_a = entities_list[i]
                    entity_b = entities_list[j]

                    features_a = entity_features[entity_a.id].unsqueeze(0)
                    features_b = entity_features[entity_b.id].unsqueeze(0)

                    with torch.no_grad():
                        similarity = self.entity_model(features_a, features_b)
                        confidence = float(similarity.item())

                    if confidence >= request.threshold:
                        match = EntityMatch(
                            entity_a_id=entity_a.id,
                            entity_b_id=entity_b.id,
                            confidence=confidence,
                            method="neural_similarity",
                        )

                        if request.include_features:
                            match.features = {
                                "name_similarity": self._calculate_name_similarity(
                                    entity_a.name, entity_b.name
                                ),
                                "type_match": 1.0 if entity_a.type == entity_b.type else 0.0,
                                "neural_confidence": confidence,
                            }

                        matches.append(match)

            processing_time = (time.time() - start_time) * 1000

            response = EntityResolutionResponse(
                matches=matches,
                processing_time_ms=processing_time,
                model_version=self.model_version,
            )

            # Cache result
            if not request.include_features:
                await self.redis_client.setex(cache_key, CONFIG["model_cache_ttl"], response.json())

            return response

    async def score_links(self, request: LinkScoringRequest) -> LinkScoringResponse:
        """Perform link scoring"""
        start_time = time.time()

        with LINK_SCORING_DURATION.time():
            scores = []

            for pair in request.entity_pairs:
                # Extract and combine features
                features_a = self.extract_features(pair.entity_a)
                features_b = self.extract_features(pair.entity_b)

                # Simple feature combination - concatenation
                combined_features = np.concatenate([features_a, features_b])

                # Pad to expected input size
                target_size = 256
                if len(combined_features) < target_size:
                    combined_features = np.pad(
                        combined_features, (0, target_size - len(combined_features))
                    )
                else:
                    combined_features = combined_features[:target_size]

                features_tensor = (
                    torch.tensor(combined_features, dtype=torch.float32)
                    .unsqueeze(0)
                    .to(CONFIG["device"])
                )

                with torch.no_grad():
                    link_score = self.link_model(features_tensor)
                    score_value = float(link_score.item())

                # Calculate confidence (simplified)
                confidence = min(score_value * 1.2, 1.0) if score_value > 0.5 else score_value * 0.8

                link_score_obj = LinkScore(
                    entity_a_id=pair.entity_a.id,
                    entity_b_id=pair.entity_b.id,
                    score=score_value,
                    confidence=confidence,
                    features={
                        "neural_score": score_value,
                        "name_similarity": self._calculate_name_similarity(
                            pair.entity_a.name, pair.entity_b.name
                        ),
                        "type_compatibility": self._calculate_type_compatibility(
                            pair.entity_a.type, pair.entity_b.type
                        ),
                        "context_relevance": 0.5 if pair.context else 0.0,
                    },
                )

                scores.append(link_score_obj)

            processing_time = (time.time() - start_time) * 1000

            return LinkScoringResponse(
                scores=scores, processing_time_ms=processing_time, model_version=self.model_version
            )

    def _calculate_name_similarity(self, name1: str, name2: str) -> float:
        """Simple name similarity calculation"""
        # Jaccard similarity on words
        words1 = set(name1.lower().split())
        words2 = set(name2.lower().split())

        if not words1 and not words2:
            return 1.0
        if not words1 or not words2:
            return 0.0

        intersection = len(words1.intersection(words2))
        union = len(words1.union(words2))

        return intersection / union if union > 0 else 0.0

    def _calculate_type_compatibility(self, type1: str, type2: str) -> float:
        """Calculate type compatibility score"""
        if type1 == type2:
            return 1.0

        # Define compatible types
        compatible_types = {
            ("person", "organization"): 0.3,
            ("organization", "location"): 0.5,
            ("event", "location"): 0.7,
        }

        key = tuple(sorted([type1, type2]))
        return compatible_types.get(key, 0.1)

    async def get_health(self) -> HealthResponse:
        """Health check"""
        cache_status = "healthy"
        try:
            await self.redis_client.ping()
        except Exception:
            cache_status = "unhealthy"

        return HealthResponse(
            status="healthy" if self.entity_model and self.link_model else "degraded",
            models_loaded=2 if self.entity_model and self.link_model else 0,
            cache_status=cache_status,
            feature_flags={"ai_scoring": CONFIG["feature_flag_ai_scoring"]},
            uptime_seconds=time.time() - self.start_time,
        )

    async def cleanup(self):
        """Cleanup resources"""
        if self.redis_client:
            await self.redis_client.close()
        logger.info("🧹 AI Insights Service cleanup completed")


# Global service instance
ai_service = AIInsightsService()


# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await ai_service.initialize()
    yield
    # Shutdown
    await ai_service.cleanup()


# FastAPI app
app = FastAPI(
    title="AI Insights MVP-0",
    description="Entity resolution and link scoring service for IntelGraph",
    version="0.1.0",
    lifespan=lifespan,
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)


# Dependency for feature flag
def require_ai_scoring():
    if not CONFIG["feature_flag_ai_scoring"]:
        raise HTTPException(status_code=503, detail="AI scoring feature is disabled")


# Routes
@app.post("/resolve-entities", response_model=EntityResolutionResponse)
async def resolve_entities(request: EntityResolutionRequest):
    """Resolve similar entities"""
    REQUEST_COUNT.labels(method="POST", endpoint="/resolve-entities").inc()

    if len(request.entities) > CONFIG["max_entities_per_request"]:
        raise HTTPException(
            status_code=400,
            detail=f"Too many entities. Maximum allowed: {CONFIG['max_entities_per_request']}",
        )

    with REQUEST_DURATION.time():
        return await ai_service.resolve_entities(request)


@app.post(
    "/score-links", response_model=LinkScoringResponse, dependencies=[Depends(require_ai_scoring)]
)
async def score_links(request: LinkScoringRequest):
    """Score entity relationship links"""
    REQUEST_COUNT.labels(method="POST", endpoint="/score-links").inc()

    if len(request.entity_pairs) > CONFIG["max_entities_per_request"]:
        raise HTTPException(
            status_code=400,
            detail=f"Too many entity pairs. Maximum allowed: {CONFIG['max_entities_per_request']}",
        )

    with REQUEST_DURATION.time():
        return await ai_service.score_links(request)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    REQUEST_COUNT.labels(method="GET", endpoint="/health").inc()
    return await ai_service.get_health()


@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return Response(generate_latest(), media_type="text/plain")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "AI Insights MVP-0",
        "version": "0.1.0",
        "status": "operational",
        "features": ["entity-resolution", "link-scoring"],
        "docs": "/docs",
    }


if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        log_level="info",
        reload=os.getenv("NODE_ENV") != "production",
    )
