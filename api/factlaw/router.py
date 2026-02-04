from fastapi import APIRouter, HTTPException
from ..platform_spine import flags

router = APIRouter(prefix="/factlaw", tags=["FactLaw"])

@router.get("/health")
async def health():
    if not flags.FACTLAW_ENABLED:
        raise HTTPException(status_code=404, detail="FactLaw is disabled")
    return {"status": "ok", "product": "FactLaw"}
