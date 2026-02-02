from typing import List, Optional, Dict
from pydantic import BaseModel, Field

class Aliases(BaseModel):
    cve: List[str] = Field(default_factory=list)
    ghsa: List[str] = Field(default_factory=list)
    osv: List[str] = Field(default_factory=list)
    vendor: List[str] = Field(default_factory=list)

class Affected(BaseModel):
    package: str
    ecosystem: str
    versions: List[str] = Field(default_factory=list)

class Severity(BaseModel):
    system: str
    score: str
    vector: Optional[str] = None
    source: str

class Reference(BaseModel):
    url: str
    source: Optional[str] = None

class Provenance(BaseModel):
    source_name: str
    source_url: Optional[str] = None
    retrieved_via: Optional[str] = None
    evidence_id: str
    fingerprint: Optional[str] = None

class VulnRecord(BaseModel):
    record_id: str
    aliases: Aliases
    title: Optional[str] = None
    summary: Optional[str] = None
    details: Optional[str] = None
    affected: List[Affected] = Field(default_factory=list)
    severity: List[Severity] = Field(default_factory=list)
    references: List[Reference] = Field(default_factory=list)
    provenance: List[Provenance]
    policy_flags: Dict[str, bool] = Field(default_factory=dict)
