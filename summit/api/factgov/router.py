from fastapi import APIRouter

router = APIRouter(prefix="/api/factgov", tags=["FactGov"])

@router.get("/health")
async def health():
    return {"status": "healthy", "product": "factgov"}
