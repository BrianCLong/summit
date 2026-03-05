from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
import datetime

class ShapIQReport(BaseModel):
    version: str = "1.0.0"
    model_id: str
    instance_id: Optional[str] = None
    attributions: Dict[str, float]
    interactions: Optional[Dict[str, float]] = None

class ShapIQMetrics(BaseModel):
    latency_ms: float
    memory_mb: float
    interaction_density: float

class ShapIQStamp(BaseModel):
    evidence_id: str
    model_hash: str
    data_hash: str
    config_hash: str
