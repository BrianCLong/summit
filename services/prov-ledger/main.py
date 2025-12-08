from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from hashlib import sha256
from datetime import datetime
import uuid

app = FastAPI(title="prov-ledger", version="1.0.0")


class ClaimIn(BaseModel):
    evidenceId: str = Field(min_length=3)
    assertion: str = Field(min_length=1)


class ClaimOut(BaseModel):
    id: str
    hash: str
    createdAt: str
    evidenceId: str


@app.get("/healthz")
def health():
    return {"ok": True, "service": "prov-ledger"}


@app.post("/claim", response_model=ClaimOut, status_code=201)
def register_claim(body: ClaimIn):
    cid = "clm_" + uuid.uuid4().hex[:10]
    h = "sha256:" + sha256(f"{body.evidenceId}:{body.assertion}".encode()).hexdigest()
    return ClaimOut(id=cid, hash=h, createdAt=datetime.utcnow().isoformat() + "Z", evidenceId=body.evidenceId)
