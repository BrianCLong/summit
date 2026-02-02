from fastapi import APIRouter, HTTPException
from ..platform_spine import flags

router = APIRouter(prefix="/factmarkets", tags=["FactMarkets"])

@router.get("/health")
async def health():
    if not flags.FACTMARKETS_ENABLED:
        raise HTTPException(status_code=404, detail="FactMarkets is disabled")
    return {"status": "ok", "product": "FactMarkets"}
