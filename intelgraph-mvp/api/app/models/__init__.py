from datetime import datetime
from typing import List, Optional

from datetime import datetime

from pydantic import BaseModel, Field


class Provenance(BaseModel):
    source: str
    collected_at: datetime | None = None
    license: str | None = None
    transform_chain: list[str] = Field(default_factory=list)
    confidence: float | None = None


class Policy(BaseModel):
    origin: str | None = None
    sensitivity: str
    clearance: list[str] = Field(default_factory=list)
    legal_basis: list[str] = Field(default_factory=list)
    need_to_know: list[str] = Field(default_factory=list)


class NodeBase(BaseModel):
    id: str
    tenant_id: str
    case_id: str
    provenance: Provenance
    policy: Policy
    created_by: str
    created_at: datetime


class Person(NodeBase):
    name: str
    emails: list[str] = Field(default_factory=list)
    phones: list[str] = Field(default_factory=list)
    nationality: str | None = None


class Org(NodeBase):
    name: str
    domain: str | None = None


class Location(NodeBase):
    name: str
    lat: float
    lon: float


class Event(NodeBase):
    name: str
    occurred_at: datetime


class Document(NodeBase):
    title: str
    url: str | None = None
    hash: str | None = None


class Relationship(BaseModel):
    id: str
    tenant_id: str
    case_id: str
    source: str
    target: str
    type: str
    provenance: Provenance
    policy: Policy
    created_by: str
    created_at: datetime
    role: str | None = None
