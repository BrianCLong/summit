from fastapi import APIRouter, HTTPException
from ..platform_spine import flags

router = APIRouter(prefix="/factflow", tags=["FactFlow"])

@router.get("/health")
async def health():
    if not flags.FACTFLOW_ENABLED:
        raise HTTPException(status_code=404, detail="FactFlow is disabled")
    return {"status": "ok", "product": "FactFlow"}

@router.post("/verify")
async def verify():
    if not flags.FACTFLOW_ENABLED:
        raise HTTPException(status_code=404, detail="FactFlow is disabled")
    return {"message": "FactFlow verification endpoint"}
