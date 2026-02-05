from fastapi import APIRouter
from api.platform_spine import flags

router = APIRouter(prefix="/factmarkets", tags=["factmarkets"])

@router.get("/health")
async def health():
    return {"product": "FactMarkets", "status": "ok"}
