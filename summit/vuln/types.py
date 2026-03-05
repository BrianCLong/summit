from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class Aliases(BaseModel):
    cve: list[str] = Field(default_factory=list)
    ghsa: list[str] = Field(default_factory=list)
    osv: list[str] = Field(default_factory=list)
    vendor: list[str] = Field(default_factory=list)

class Affected(BaseModel):
    package: str
    ecosystem: str
    versions: list[str] = Field(default_factory=list)

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
    affected: list[Affected] = Field(default_factory=list)
    severity: list[Severity] = Field(default_factory=list)
    references: list[Reference] = Field(default_factory=list)
    provenance: list[Provenance]
    policy_flags: dict[str, bool] = Field(default_factory=dict)
