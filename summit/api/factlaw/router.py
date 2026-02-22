from fastapi import APIRouter

router = APIRouter(prefix="/api/factlaw", tags=["FactLaw"])

@router.get("/health")
async def health():
    return {"status": "healthy", "product": "factlaw"}
