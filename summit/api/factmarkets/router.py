from fastapi import APIRouter

router = APIRouter(prefix="/api/factmarkets", tags=["FactMarkets"])

@router.get("/health")
async def health():
    return {"status": "healthy", "product": "factmarkets"}
