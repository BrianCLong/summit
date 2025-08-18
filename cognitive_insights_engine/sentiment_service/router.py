from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from .model import LLMGraphSentimentModel
from .utils import fetch_neighbour_entities


class SentimentRequest(BaseModel):
    entity_id: str
    text: str


class SentimentResponse(BaseModel):
    sentiment: str
    score: float
    influence_map: dict[str, float]


router = APIRouter(prefix="/sentiment", tags=["sentiment"])


async def get_model() -> LLMGraphSentimentModel:
    return LLMGraphSentimentModel()


@router.post("/analyze", response_model=SentimentResponse)
async def analyze(
    request: SentimentRequest, model: LLMGraphSentimentModel = Depends(get_model)
) -> SentimentResponse:
    neighbours = await fetch_neighbour_entities(None, request.entity_id)
    result = await model.analyze(request.text, neighbours)
    return SentimentResponse(**result)
