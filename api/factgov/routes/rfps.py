from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def list_rfps():
    return [{"id": "rfp_1", "title": "AI Audit Services"}]
