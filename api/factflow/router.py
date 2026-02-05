from fastapi import APIRouter
from api.platform_spine import flags

router = APIRouter(prefix="/factflow", tags=["factflow"])

@router.get("/health")
async def health():
    return {"product": "FactFlow", "status": "ok"}
