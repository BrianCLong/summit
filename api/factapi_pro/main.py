from fastapi import FastAPI, Depends, HTTPException, status, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any
import uuid
import asyncio

from .config import config
from .middleware.api_key_auth import verify_api_key
from .metering.service import metering_service
from .concurrency.guard import concurrency_guard
from .webhooks.security import verify_webhook

app = FastAPI(
    title="FactAPI Pro",
    description="White-label verification API",
    version="1.0.0",
    docs_url="/docs" if config.FACTAPI_PRO_ENABLED else None,
    redoc_url="/redoc" if config.FACTAPI_PRO_ENABLED else None,
    openapi_url="/openapi.json" if config.FACTAPI_PRO_ENABLED else None,
)

class VerifyRequest(BaseModel):
    claim: str
    context: Optional[str] = None

class VerifyResponse(BaseModel):
    verified: bool
    score: float
    reasoning: str
    timestamp: Optional[str] = None # Determinism: No timestamp by default in MWS artifacts, but API response might have it. MWS says "generated artifacts contain no timestamps". API response is runtime.

@app.post("/v1/verify", response_model=VerifyResponse)
async def verify(request: VerifyRequest, api_key: str = Depends(verify_api_key)):
    if not config.FACTAPI_PRO_ENABLED:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="FactAPI Pro is currently disabled.")

    await concurrency_guard.acquire(api_key)
    try:
        metering_service.check_quota(api_key)

        # Stub implementation
        # Simulate processing time to allow testing concurrency
        await asyncio.sleep(0.01)

        metering_service.record_usage(api_key)

        return VerifyResponse(
            verified=True,
            score=0.95,
            reasoning="Stub verification: Claim appears consistent with internal axioms."
        )
    finally:
        concurrency_guard.release(api_key)

@app.get("/health")
def health_check():
    return {"status": "ok", "enabled": config.FACTAPI_PRO_ENABLED}

class AsyncVerifyResponse(BaseModel):
    job_id: str
    status: str

@app.post("/v1/verify/async", response_model=AsyncVerifyResponse)
async def verify_async(request: VerifyRequest, api_key: str = Depends(verify_api_key)):
    if not config.FACTAPI_PRO_ENABLED:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="FactAPI Pro is currently disabled.")

    metering_service.check_quota(api_key)
    # Stub: Don't wait for concurrency guard? Or maybe we should.
    # Async usually queues it. So we check quota but don't hold concurrency slot yet?
    # Or we verify we can queue it.

    job_id = str(uuid.uuid4())
    metering_service.record_usage(api_key) # Record usage on acceptance? Or on completion? MWS simplicity: acceptance.

    return AsyncVerifyResponse(job_id=job_id, status="queued")

@app.post("/v1/webhooks/inbound")
async def webhook_inbound(request: Request, _ = Depends(verify_webhook)):
    # Stub: Process inbound webhook (e.g. payment success)
    return {"status": "received"}
