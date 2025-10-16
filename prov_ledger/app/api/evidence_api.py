"""
Sprint 14 Prov-Ledger Beta - Evidence Register API
POST /evidence/register → checksum, license, transforms
"""

import hashlib
import json
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone

import structlog
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

logger = structlog.get_logger(__name__)


class TransformType(str):
    NORMALIZE = "normalize"
    ENRICH = "enrich"
    AGGREGATE = "aggregate"
    FILTER = "filter"
    ANONYMIZE = "anonymize"


class LicenseType(str):
    PUBLIC = "public"
    INTERNAL = "internal"
    RESTRICTED = "restricted"
    CLASSIFIED = "classified"


class Transform(BaseModel):
    type: str = Field(..., description="Transform type")
    operator: str = Field(..., min_length=1, max_length=255)
    timestamp: datetime
    input_checksum: str = Field(..., regex=r"^[a-f0-9]{64}$")
    output_checksum: str = Field(..., regex=r"^[a-f0-9]{64}$")
    parameters: dict | None = None


class EvidenceRegisterRequest(BaseModel):
    checksum: str = Field(..., regex=r"^[a-f0-9]{64}$", description="SHA-256 checksum")
    license: str = Field(..., description="License type")
    transforms: list[Transform] = Field(..., min_items=1, max_items=50)
    content_type: str | None = None
    size_bytes: int | None = None
    metadata: dict | None = None


class EvidenceRegisterResponse(BaseModel):
    evidence_id: str
    checksum: str
    license: str
    transforms_count: int
    registered_at: datetime
    verification_status: str
    signature: str | None = None


@dataclass
class EvidenceRecord:
    """Evidence record for storage"""

    id: str
    checksum: str
    license: str
    transforms: list[dict]
    registered_by: str
    registered_at: datetime
    verification_status: str = "pending"
    signature: str | None = None


class EvidenceService:
    """Evidence registration service"""

    def __init__(self):
        self.evidence_store: dict[str, EvidenceRecord] = {}
        self.logger = logger.bind(service="evidence_register")

    async def register_evidence(
        self, request: EvidenceRegisterRequest, user_id: str
    ) -> EvidenceRegisterResponse:
        """Register evidence with transforms"""
        evidence_id = str(uuid.uuid4())
        timestamp = datetime.now(timezone.utc)

        self.logger.info(
            "Registering evidence", evidence_id=evidence_id, checksum=request.checksum[:16] + "..."
        )

        # Validate transform chain
        self._validate_transform_chain(request.transforms)

        # Create evidence record
        evidence_record = EvidenceRecord(
            id=evidence_id,
            checksum=request.checksum,
            license=request.license,
            transforms=[t.dict() for t in request.transforms],
            registered_by=user_id,
            registered_at=timestamp,
        )

        # Generate signature
        evidence_record.signature = self._sign_evidence(evidence_record)

        # Store evidence
        self.evidence_store[evidence_id] = evidence_record

        self.logger.info(
            "Evidence registered", evidence_id=evidence_id, transforms_count=len(request.transforms)
        )

        return EvidenceRegisterResponse(
            evidence_id=evidence_id,
            checksum=request.checksum,
            license=request.license,
            transforms_count=len(request.transforms),
            registered_at=timestamp,
            verification_status="pending",
            signature=evidence_record.signature,
        )

    def _validate_transform_chain(self, transforms: list[Transform]):
        """Validate transform chain integrity"""
        if not transforms:
            raise HTTPException(400, "At least one transform required")

        for i, transform in enumerate(transforms):
            if i == 0:
                continue

            # Each transform's input should match previous output
            if transform.input_checksum != transforms[i - 1].output_checksum:
                raise HTTPException(400, f"Transform chain broken at index {i}: checksum mismatch")

    def _sign_evidence(self, evidence: EvidenceRecord) -> str:
        """Create signature for evidence record"""
        canonical_data = {
            "id": evidence.id,
            "checksum": evidence.checksum,
            "license": evidence.license,
            "transforms": evidence.transforms,
            "registered_by": evidence.registered_by,
            "registered_at": evidence.registered_at.isoformat(),
        }

        canonical_json = json.dumps(canonical_data, sort_keys=True)
        return hashlib.sha256(canonical_json.encode()).hexdigest()


# FastAPI application
def create_evidence_app():
    """Create evidence register FastAPI app"""
    app = FastAPI(
        title="Prov-Ledger Evidence Register",
        description="Sprint 14 Beta - Evidence registration API",
        version="1.0.0-beta",
    )

    service = EvidenceService()

    @app.post("/evidence/register", response_model=EvidenceRegisterResponse)
    async def register_evidence(request: EvidenceRegisterRequest):
        """Register evidence with transforms and metadata"""
        # Mock user authentication - replace with real JWT validation
        user_id = "system_user"
        return await service.register_evidence(request, user_id)

    @app.get("/evidence/{evidence_id}")
    async def get_evidence(evidence_id: str):
        """Get evidence by ID"""
        evidence = service.evidence_store.get(evidence_id)
        if not evidence:
            raise HTTPException(404, "Evidence not found")

        return {
            "evidence_id": evidence.id,
            "checksum": evidence.checksum,
            "license": evidence.license,
            "registered_at": evidence.registered_at,
            "verification_status": evidence.verification_status,
            "signature": evidence.signature,
        }

    @app.get("/health")
    async def health_check():
        """Health check endpoint"""
        return {
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "service": "prov-ledger-evidence-register",
            "version": "1.0.0-beta",
        }

    return app


if __name__ == "__main__":
    import uvicorn

    app = create_evidence_app()
    uvicorn.run(app, host="0.0.0.0", port=8000)
