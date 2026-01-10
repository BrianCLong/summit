from typing import Any

from pydantic import BaseModel


class PredictionRequest(BaseModel):
    model_name: str
    version: str
    data: list[dict[str, Any]]


class PredictionResponse(BaseModel):
    model_name: str
    version: str
    predictions: list[Any]
    latency_ms: float


class HealthResponse(BaseModel):
    status: str
    version: str
