import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ShapIQReport(BaseModel):
    version: str = "1.0.0"
    model_id: str
    instance_id: Optional[str] = None
    attributions: dict[str, float]
    interactions: Optional[dict[str, float]] = None

class ShapIQMetrics(BaseModel):
    latency_ms: float
    memory_mb: float
    interaction_density: float

class ShapIQStamp(BaseModel):
    evidence_id: str
    model_hash: str
    data_hash: str
    config_hash: str
