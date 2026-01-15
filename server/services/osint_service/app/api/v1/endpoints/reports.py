from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter()


@router.get("/{scan_id}")
def generate_report(scan_id: str):
    """
    Generate a report for a specific scan.
    """
    # Placeholder for actual implementation
    report_data = {
        "scan_id": scan_id,
        "summary": "This is a sample OSINT report.",
        "findings": [],
    }
    return JSONResponse(content=report_data)
