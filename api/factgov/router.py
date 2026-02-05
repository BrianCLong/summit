from fastapi import APIRouter
from api.platform_spine import flags

router = APIRouter(prefix="/factgov", tags=["factgov"])

@router.get("/health")
async def health():
    if not flags.FACTGOV_ENABLED:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="FactGov disabled")
    return {"product": "FactGov", "status": "ok"}
