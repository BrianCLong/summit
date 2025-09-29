from __future__ import annotations

import re
from typing import List

from fastapi import APIRouter, Request
from pydantic import BaseModel

router = APIRouter(prefix="/threat", tags=["threat"])

NEGATIVE_KEYWORDS = {"attack", "malware", "breach", "phishing", "ransom"}


class ThreatInsightsResponse(BaseModel):
    score: float
    sentiment: str
    cluster: int
    origin: str
    related_actors: List[str]
    recent_activity: List[str] = []


@router.get("/insights", response_model=ThreatInsightsResponse)
async def threat_insights(request: Request, target: str) -> ThreatInsightsResponse:
    words = re.findall(r"\w+", target.lower())
    score = min(1.0, sum(w in NEGATIVE_KEYWORDS for w in words) / 2)
    sentiment = "negative" if any(w in NEGATIVE_KEYWORDS for w in words) else "neutral"
    cluster = hash(target) % 5
    actors = re.findall(r"[A-Z][a-z]+", target)
    origin = request.client.host if request.client else "unknown"
    return ThreatInsightsResponse(
        score=score,
        sentiment=sentiment,
        cluster=cluster,
        origin=origin,
        related_actors=actors,
        recent_activity=[],
    )
