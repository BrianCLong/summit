"""FastAPI routing."""

from __future__ import annotations

import time

from fastapi import APIRouter, Depends, Request
from fastapi.responses import PlainTextResponse
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from .diagnostics import analyze_text
from .ethics import guard_request
from .guidance import generate_guidance
from .observability import record_metrics
from .redact import redact_text
from .rewrite import rewrite_text
from .schemas import AnalyzeRequest, AnalyzeResponse, Rewrite, ToneDiagnostic
from .security import api_key_auth, rate_limiter

router = APIRouter()


@router.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/readyz")
async def readyz() -> dict[str, str]:
    return {"status": "ready"}


@router.get("/metrics", response_class=PlainTextResponse)
async def metrics() -> PlainTextResponse:
    data = generate_latest()
    return PlainTextResponse(data, media_type=CONTENT_TYPE_LATEST)


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    req: AnalyzeRequest,
    request: Request,
    _rl: None = Depends(rate_limiter),
    _auth: None = Depends(api_key_auth),
) -> AnalyzeResponse:
    guard_request(req.text)
    start = time.time()
    redacted, _ = redact_text(req.text)
    diag = analyze_text(redacted)
    rewrite, flags = rewrite_text(redacted)
    guidance = generate_guidance(redacted)
    latency = time.time() - start
    record_metrics(latency, latency, "content_drift" in flags)
    diagnostic = ToneDiagnostic(
        sentiment=diag["sentiment"],
        emotion=diag["emotion"],
        toxicity=diag["toxicity"],
        absolutist_score=diag["absolutist_score"],
        caps_ratio=diag["caps_ratio"],
    )
    return AnalyzeResponse(
        rewrite=Rewrite(version="v1", text=rewrite),
        diagnostic=diagnostic,
        guidance=guidance,
        policy_flags=flags,
    )
