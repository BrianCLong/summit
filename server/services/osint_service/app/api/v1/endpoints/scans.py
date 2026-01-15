from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel

router = APIRouter()


class ScanRequest(BaseModel):
    target: str
    modules: list


def run_scan(target: str, modules: list):
    # Placeholder for the actual scanning logic
    print(f"Starting scan for {target} with modules: {modules}")


@router.post("/")
def start_scan(scan_request: ScanRequest, background_tasks: BackgroundTasks):
    """
    Start a new OSINT scan.
    """
    background_tasks.add_task(run_scan, scan_request.target, scan_request.modules)
    return {"message": "Scan started in the background."}
