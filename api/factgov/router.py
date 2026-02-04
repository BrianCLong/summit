from fastapi import APIRouter, HTTPException
from ..platform_spine import flags

router = APIRouter(prefix="/factgov", tags=["FactGov"])

@router.get("/health")
async def health():
    if not flags.FACTGOV_ENABLED:
        raise HTTPException(status_code=404, detail="FactGov is disabled")
    return {"status": "ok", "product": "FactGov"}
