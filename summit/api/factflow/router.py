from fastapi import APIRouter, Depends

from summit.services.shared.core_verification import CoreVerificationService

router = APIRouter(prefix="/api/factflow", tags=["FactFlow"])

@router.post("/verify-live-transcript")
async def verify_live_transcript(
    transcript: str,
    verification: CoreVerificationService = Depends()
):
    """
    Live fact-checking for newsroom transcripts
    """
    result = await verification.verify_claim(
        claim=transcript,
        product="factflow"
    )

    return {
        "claim": transcript,
        "verdict": result["verdict"],
        "confidence": result["confidence"],
        "evidence": result["evidence"]
    }

@router.get("/health")
async def health():
    return {"status": "healthy", "product": "factflow"}
