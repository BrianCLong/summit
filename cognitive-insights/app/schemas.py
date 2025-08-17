from __future__ import annotations

from typing import Dict, List, Optional
from pydantic import BaseModel


class TextItem(BaseModel):
    id: str
    text: str
    lang: Optional[str] = None


class AnalyzeRequest(BaseModel):
    items: List[TextItem]
    class Config:
        extra = "allow"


EmotionDistribution = Dict[str, float]


class BiasIndicator(BaseModel):
    type: str
    confidence: float


class AnalysisResult(BaseModel):
    item_id: str
    language: str
    sentiment: Dict[str, float]
    emotion: Dict[str, float]
    bias_indicators: List[BiasIndicator]
    toxicity: Dict[str, float]
    safety_guidance: List[str]
    policy_flags: List[str]


class AggregateResponse(BaseModel):
    metrics: Dict[str, float | Dict[str, float]]
