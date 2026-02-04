import hmac
import hashlib
import time
import os
from fastapi import HTTPException, status, Header, Request

def get_secret() -> bytes:
    # In production, this must be set. Default provided for dev/test only.
    return os.getenv("FACTAPI_PRO_WEBHOOK_SECRET", "test-secret").encode()

async def verify_webhook(
    request: Request,
    x_hub_signature: str = Header(..., alias="X-Hub-Signature"),
    x_timestamp: int = Header(..., alias="X-Timestamp")
):
    # Replay protection: 5 minute window
    now = int(time.time())
    if abs(now - x_timestamp) > 300:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Timestamp out of bounds (replay protection)"
        )

    body = await request.body()

    secret = get_secret()
    expected_signature = hmac.new(secret, body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(f"sha256={expected_signature}", x_hub_signature):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid signature"
        )
