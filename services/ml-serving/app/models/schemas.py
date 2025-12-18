from pydantic import BaseModel
from typing import List, Dict, Any

class PredictionRequest(BaseModel):
    model_name: str
    version: str
    data: List[Dict[str, Any]]

class PredictionResponse(BaseModel):
    model_name: str
    version: str
    predictions: List[Any]
    latency_ms: float

class HealthResponse(BaseModel):
    status: str
    version: str
