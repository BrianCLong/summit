from __future__ import annotations

from typing import List

from fastapi import APIRouter, Request

from .ethics import ensure_non_persuasive
from .pipeline import analyze_batch
from .schemas import AggregateResponse, AnalyzeRequest, AnalysisResult

router = APIRouter()


@router.post("/analyze", response_model=List[AnalysisResult])
def analyze(req: AnalyzeRequest, request: Request) -> List[AnalysisResult]:
    ensure_non_persuasive(request.query_params)
    ensure_non_persuasive(req.dict())
    return analyze_batch(req.items)


@router.get("/aggregates", response_model=AggregateResponse)
def aggregates() -> AggregateResponse:
    return AggregateResponse(metrics={})


@router.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/readyz")
def readyz() -> dict[str, str]:
    return {"status": "ready"}
