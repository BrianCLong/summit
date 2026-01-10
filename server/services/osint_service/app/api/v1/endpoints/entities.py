from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def get_all_entities() -> list[dict]:
    """
    Retrieve all identified entities.
    """
    # Placeholder for actual implementation
    return [{"id": "1", "type": "domain", "value": "example.com"}]


@router.get("/{entity_id}")
def get_entity(entity_id: str) -> dict:
    """
    Get a specific entity by its ID.
    """
    # Placeholder for actual implementation
    return {"id": entity_id, "type": "domain", "value": "example.com", "details": {}}
