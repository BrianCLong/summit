from fastapi import Header, HTTPException, status
import os
from typing import Optional
from ..config import config

async def verify_api_key(x_api_key: Optional[str] = Header(None, alias="X-API-Key")):
    """
    Verifies the API key provided in the header.
    Deny-by-default: If key is missing or invalid, raise 401.
    """
    if not x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API Key",
        )

    # MWS: Simple check against env var or mock store.
    # In production, this would check a database/cache.
    # We use a distinct env var for FactAPI Pro keys to separate from the main API.
    valid_keys = os.getenv("FACTAPI_PRO_VALID_KEYS", "test-key-123").split(",")

    if x_api_key not in valid_keys:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API Key",
        )

    return x_api_key
