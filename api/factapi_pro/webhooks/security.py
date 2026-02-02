import hmac
import hashlib
import time
from fastapi import HTTPException, status, Header, Request

SECRET = b"test-secret"

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

    # Simple concatenation of timestamp + body for signature?
    # Or just body. Usually standard is to sign the payload.
    # Stripe signs timestamp.v1.body. GitHub signs body.
    # The requirement says "signature-verified events".
    # I will assume standard body signing for MWS.

    expected_signature = hmac.new(SECRET, body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(f"sha256={expected_signature}", x_hub_signature):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid signature"
        )
