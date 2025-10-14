from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import uuid

router = APIRouter(prefix="/ingest", tags=["ingest"])

class StartIngestReq(BaseModel):
    connector: str
    config: dict

@router.get("/connectors")
def list_connectors():
    # Hard-coded for now; align with available modules
    return {
        "items": [
            {"id":"twitter","name":"Twitter/X"},
            {"id":"tiktok","name":"TikTok"},
            {"id":"rss","name":"RSS"},
            {"id":"youtube","name":"YouTube"},
            {"id":"reddit","name":"Reddit"},
            {"id":"telegram","name":"Telegram"}
        ]
    }

@router.post("/start")
def start_ingest(req: StartIngestReq):
    # Normally would enqueue a job; return a job id placeholder
    job_id = str(uuid.uuid4())
    return {"ok": True, "job_id": job_id, "connector": req.connector}

