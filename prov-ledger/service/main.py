import hashlib
from datetime import datetime

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI()


# Data Models
class Evidence(BaseModel):
    source: str
    transform: str
    checksum: str
    licenseRef: str | None = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class Claim(BaseModel):
    text: str
    evidenceRefs: list[str]  # List of checksums or IDs of Evidence
    confidence: float = Field(..., ge=0.0, le=1.0)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ManifestEntry(BaseModel):
    path: str
    checksum: str
    transform_chain: list[str]


class Manifest(BaseModel):
    caseId: str
    entries: list[ManifestEntry]
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# In-memory storage (for MVP)
_evidence_store: dict[str, Evidence] = {}
_claim_store: dict[str, Claim] = {}
_manifest_store: dict[str, Manifest] = {}


# API Endpoints
@app.post("/evidence/register")
async def register_evidence(evidence: Evidence):
    if evidence.checksum in _evidence_store:
        raise HTTPException(status_code=409, detail="Evidence with this checksum already exists")
    _evidence_store[evidence.checksum] = evidence
    return {"message": "Evidence registered successfully", "checksum": evidence.checksum}


@app.post("/claim")
async def register_claim(claim: Claim):
    # Validate evidenceRefs exist
    for ref in claim.evidenceRefs:
        if ref not in _evidence_store:
            raise HTTPException(status_code=404, detail=f"Evidence reference {ref} not found")
    claim_id = hashlib.sha256(claim.text.encode() + str(datetime.utcnow()).encode()).hexdigest()
    _claim_store[claim_id] = claim
    return {"message": "Claim registered successfully", "claim_id": claim_id}


@app.get("/export/manifest/{caseId}")
async def get_manifest(caseId: str):
    if caseId not in _manifest_store:
        raise HTTPException(status_code=404, detail="Manifest not found for this caseId")
    return _manifest_store[caseId]


# Helper to simulate manifest creation (for demo purposes)
@app.post("/simulate_manifest_creation")
async def simulate_manifest_creation(caseId: str, paths: list[str]):
    entries = []
    for p in paths:
        # Simulate checksum and transform chain
        checksum = hashlib.sha256(p.encode()).hexdigest()
        transform_chain = ["ingest_raw", "parse_json"]
        entries.append(ManifestEntry(path=p, checksum=checksum, transform_chain=transform_chain))
    manifest = Manifest(caseId=caseId, entries=entries)
    _manifest_store[caseId] = manifest
    return {"message": "Manifest simulated successfully", "caseId": caseId}
