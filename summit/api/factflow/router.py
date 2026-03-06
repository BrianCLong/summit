from fastapi import APIRouter, Depends
from summit.services.shared.core_verification import CoreVerificationService
from summit.observability import Metrics
import time

router = APIRouter(prefix="/api/factflow", tags=["FactFlow"])

@router.post("/verify-live-transcript")
async def verify_live_transcript(
    transcript: str,
    verification: CoreVerificationService = Depends()
):
    """
    Live fact-checking for newsroom transcripts
    """
    start_time = time.time()
    try:
        result = await verification.verify_claim(
            claim=transcript,
            product="factflow"
        )
        Metrics.tasks_completed.labels(agent_id="factflow", task_type="verification").inc()

        return {
            "claim": transcript,
            "verdict": result["verdict"],
            "confidence": result["confidence"],
            "evidence": result["evidence"]
        }
    except Exception:
        Metrics.tasks_failed.labels(agent_id="factflow", task_type="verification").inc()
        raise
    finally:
        Metrics.flow_duration.labels(flow_name="verify_live_transcript").observe(time.time() - start_time)

@router.get("/health")
async def health():
    return {"status": "healthy", "product": "factflow"}
