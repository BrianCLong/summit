from fastapi import APIRouter
from api.platform_spine import flags

router = APIRouter(prefix="/factlaw", tags=["factlaw"])

@router.get("/health")
async def health():
    return {"product": "FactLaw", "status": "ok"}
