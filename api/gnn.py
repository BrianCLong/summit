import json
import os

import redis
from fastapi import APIRouter, Query

from gnn_predictor import GNNPredictor

router = APIRouter()
_predictor = GNNPredictor()
_redis = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"), decode_responses=True)
_CACHE_KEY = "gnn:link_predictions"
_CACHE_TTL = 3600


@router.get("/ai/gnn/link-predictions")
async def link_predictions(refresh: bool = Query(False)):
    """Return cached GNN link predictions, refreshing if requested."""
    if not refresh:
        cached = _redis.get(_CACHE_KEY)
        if cached:
            return json.loads(cached)
    predictions = _predictor.predict()
    _redis.setex(_CACHE_KEY, _CACHE_TTL, json.dumps(predictions))
    return predictions
