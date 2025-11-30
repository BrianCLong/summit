import json
import urllib.request
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class AttestationQuote:
    id: str
    region: str
    quote: str


@dataclass
class RunJobResponse:
    jobId: str
    outputHash: str
    sealedBlob: str
    attested: bool
    region: str
    nonce: str
    proofHandle: str


class CCEClient:
    def __init__(self, endpoint: str = "http://localhost:8443", quotes: Optional[List[AttestationQuote]] = None):
        self.endpoint = endpoint.rstrip('/')
        self.quotes = quotes or []

    def run_job(
        self,
        job_id: str,
        payload: str,
        manifest_hash: str,
        quote: Optional[AttestationQuote] = None,
        region: Optional[str] = None,
        allow_egress: bool = False,
        client_public_key: str = "ephemeral-client-key",
    ) -> RunJobResponse:
        selected = quote or (self.quotes[0] if self.quotes else None)
        if not selected:
            raise ValueError("Attestation quote required")
        req_body = json.dumps(
            {
                "jobId": job_id,
                "payload": payload,
                "manifestHash": manifest_hash,
                "attestationQuote": selected.quote,
                "region": region or selected.region,
                "allowEgress": allow_egress,
                "clientPublicKey": client_public_key,
            }
        ).encode()
        request = urllib.request.Request(
            f"{self.endpoint}/api.ComputeEnclave/RunJob", data=req_body, headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(request) as response:
            if response.status != 200:
                raise RuntimeError(f"CCE job failed: {response.status}")
            payload = json.loads(response.read())
            return RunJobResponse(**payload)


def default_quotes() -> List[AttestationQuote]:
    return [
        AttestationQuote(
            id="test-quote-1",
            region="us-east-1",
            quote="attest:test-quote-1:f1c8c55d3c9d5b57a3678c3a60afcd72bafc2c24d0c9b5580d1a6d1f44b68859",
        ),
        AttestationQuote(
            id="test-quote-2",
            region="eu-central-1",
            quote="attest:test-quote-2:f1c8c55d3c9d5b57a3678c3a60afcd72bafc2c24d0c9b5580d1a6d1f44b68859",
        ),
    ]
