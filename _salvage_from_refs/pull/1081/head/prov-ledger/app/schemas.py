from pydantic import BaseModel, Field


class SubmitText(BaseModel):
    text: str
    lang: str | None = None
    context: str | None = None


class Claim(BaseModel):
    id: str
    text: str
    normalized: str
    embedding: list[float] | None = None
    created_at: str


class Evidence(BaseModel):
    id: str | None = None
    kind: str
    title: str | None = None
    url: str | None = None
    hash: str | None = None
    mime: str | None = None
    created_at: str | None = None
    signed: bool | None = False
    signer_fp: str | None = None
    license_terms: str | None = None
    license_owner: str | None = None


class AttachEvidenceRequest(BaseModel):
    claim_id: str
    evidence_id: str


class Corroboration(BaseModel):
    claim_id: str
    evidence_ids: list[str]
    score: float
    breakdown: dict[str, float]


class ProvExport(BaseModel):
    nodes: list[dict]
    edges: list[dict]
    metadata: dict[str, str]


class BundleRequest(BaseModel):
    claim_ids: list[str] = Field(default_factory=list)


class ManifestEntry(BaseModel):
    id: str
    hash: str


class Manifest(BaseModel):
    root: str
    entries: list[ManifestEntry]


class DisclosureBundle(BaseModel):
    bundle_id: str
    manifest: Manifest
    claims: list[Claim]
    evidence: list[Evidence]
