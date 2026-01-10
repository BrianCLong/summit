from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def list_collectors() -> list[str]:
    """
    List all available data collectors.
    """
    # Placeholder for actual implementation
    return ["dark_web_scraper", "social_media_monitor", "s3_bucket_scanner"]


@router.get("/{collector_name}")
def get_collector_details(collector_name: str):
    """
    Get details about a specific collector.
    """
    # Placeholder for actual implementation
    return {"name": collector_name, "description": "Gathers data from various sources."}
