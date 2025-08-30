from __future__ import annotations

from pydantic import BaseModel


class TextItem(BaseModel):
    id: str
    text: str
    lang: str | None = None


class AnalyzeRequest(BaseModel):
    items: list[TextItem]

    class Config:
        extra = "allow"


EmotionDistribution = dict[str, float]


class BiasIndicator(BaseModel):
    type: str
    confidence: float


class AnalysisResult(BaseModel):
    item_id: str
    language: str
    sentiment: dict[str, float]
    emotion: dict[str, float]
    bias_indicators: list[BiasIndicator]
    toxicity: dict[str, float]
    safety_guidance: list[str]
    policy_flags: list[str]


class AggregateResponse(BaseModel):
    metrics: dict[str, float | dict[str, float]]
