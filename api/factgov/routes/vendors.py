from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def list_vendors():
    return [{"id": "vendor_1", "name": "Acme Corp", "status": "attested"}]
