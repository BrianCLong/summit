from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

Mode = Literal["caption", "vqa", "video-consistency"]

class ProvenanceV1(BaseModel):
    backend: str
    model_id: str
    tokenizer_id: str
    input_sha256: str
    timestamp: str = Field(..., description="ISO 8601 timestamp")

class MediaEvidenceV1(BaseModel):
    evidence_id: str = Field(..., pattern=r"^EVID:emu3-ntp:[a-f0-9]{12}:(caption|vqa|video-consistency):v1$")
    mode: Mode
    caption: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    qa: list[dict[str, str]] = Field(default_factory=list)
    consistency_score: Optional[float] = None
    provenance: ProvenanceV1

    class Config:
        frozen = True
