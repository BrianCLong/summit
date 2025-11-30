from dataclasses import dataclass
from typing import List, Optional
import json
import requests

@dataclass
class JobManifest:
    job_id: str
    payload: bytes
    attestation_quotes: List[bytes]
    model_pack: str

@dataclass
class RunJobRequest:
    manifest: JobManifest
    sealed_key: Optional[bytes] = None
    expected_hash: Optional[bytes] = None
    client_region: str = "us-east-1"
    allow_egress: bool = False
    kms_wrap_material: Optional[bytes] = None

@dataclass
class RunJobResponse:
    job_id: str
    result_hash: bytes
    sealed_result: bytes
    audit_token: str

class CCEClient:
    def __init__(self, host: str):
        self.host = host

    def run_job(self, req: RunJobRequest) -> RunJobResponse:
        body = {
            "manifest": {
                "jobId": req.manifest.job_id,
                "payload": list(req.manifest.payload),
                "attestationQuotes": [list(q) for q in req.manifest.attestation_quotes],
                "modelPack": req.manifest.model_pack,
            },
            "sealedKey": list(req.sealed_key) if req.sealed_key else None,
            "expectedHash": list(req.expected_hash) if req.expected_hash else None,
            "clientRegion": req.client_region,
            "allowEgress": req.allow_egress,
            "kmsWrapMaterial": list(req.kms_wrap_material) if req.kms_wrap_material else None,
        }
        resp = requests.post(f"http://{self.host}/runJob", data=json.dumps(body), headers={"content-type": "application/json"})
        resp.raise_for_status()
        data = resp.json()
        return RunJobResponse(
            job_id=data["jobId"],
            result_hash=bytes(data.get("resultHash", [])),
            sealed_result=bytes(data.get("sealedResult", [])),
            audit_token=data.get("auditToken", ""),
        )
