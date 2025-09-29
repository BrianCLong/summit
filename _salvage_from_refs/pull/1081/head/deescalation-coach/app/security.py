"""Simple security helpers: API key auth and rate limiting."""

from __future__ import annotations

import time
from collections import deque
from typing import Deque
from fastapi import HTTPException, Request

from .config import config
from .observability import logger

_request_times: Deque[float] = deque()


async def rate_limiter() -> None:
    now = time.time()
    while _request_times and now - _request_times[0] > 1:
        _request_times.popleft()
    if len(_request_times) >= config.rate_limit_rps:
        raise HTTPException(status_code=429, detail="rate_limit_exceeded")
    _request_times.append(now)


async def api_key_auth(request: Request) -> None:
    if config.auth_mode != "apikey":
        return
    if request.headers.get("X-API-Key") != (config.api_key or ""):
        raise HTTPException(status_code=401, detail="unauthorized")

    logger.info("auth_success", extra={"path": request.url.path})
