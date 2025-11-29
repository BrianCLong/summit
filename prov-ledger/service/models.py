from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class SourceBase(BaseModel):
    name: str
    url: Optional[str] = None

class SourceCreate(SourceBase):
    pass

class Source(SourceBase):
    id: int

    model_config = {"from_attributes": True}

class TransformBase(BaseModel):
    name: str
    description: Optional[str] = None

class TransformCreate(TransformBase):
    pass

class Transform(TransformBase):
    id: int

    model_config = {"from_attributes": True}

class LicenseBase(BaseModel):
    name: str
    url: Optional[str] = None

class LicenseCreate(LicenseBase):
    pass

class License(LicenseBase):
    id: int

    model_config = {"from_attributes": True}

class EvidenceBase(BaseModel):
    content: str
    source_id: int
    transform_id: int
    license_id: int

class EvidenceCreate(EvidenceBase):
    pass

class Evidence(EvidenceBase):
    id: int
    checksum: str
    created_at: datetime

    model_config = {"from_attributes": True}

class ClaimBase(BaseModel):
    content: str

class ClaimCreate(ClaimBase):
    evidence_ids: List[int]

class ClaimLink(BaseModel):
    target_claim_id: int
    relationship_type: str

class Claim(ClaimBase):
    id: int
    created_at: datetime
    evidence_ids: List[int] = []

    model_config = {"from_attributes": True}

class DisclosureBundleBase(BaseModel):
    evidence_ids: List[int]

class DisclosureBundleCreate(DisclosureBundleBase):
    pass

class DisclosureBundle(DisclosureBundleBase):
    id: int
    merkle_root: str
    created_at: datetime

    model_config = {"from_attributes": True}
