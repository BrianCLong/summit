from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional, Literal

from pydantic import BaseModel, Field


class Source(BaseModel):
    id: int
    kind: str
    name: str
    config: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SourceCreate(BaseModel):
    kind: str
    name: str
    config: Dict[str, Any] = Field(default_factory=dict)


class Pipeline(BaseModel):
    id: int
    name: str
    source_id: int
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PipelineCreate(BaseModel):
    name: str
    source_id: int


class Run(BaseModel):
    id: int
    pipeline_id: int
    status: str
    started_at: datetime = Field(default_factory=datetime.utcnow)
    finished_at: Optional[datetime] = None
    stats: Dict[str, Any] = Field(default_factory=dict)
    provenance: Optional['ProvenanceManifest'] = None
    evidence_path: Optional[str] = None


class RunCreate(BaseModel):
    pipeline_id: int


class ProvenanceStep(BaseModel):
    id: str
    type: Literal['ingest', 'transform', 'policy-check', 'export']
    tool: str
    params: Dict[str, Any] = Field(default_factory=dict)
    input_hash: str = Field(alias='inputHash')
    output_hash: str = Field(alias='outputHash')
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    note: Optional[str] = None

    class Config:
        allow_population_by_field_name = True


class ProvenanceManifest(BaseModel):
    artifact_id: str = Field(alias='artifactId')
    steps: List[ProvenanceStep] = Field(default_factory=list)

    class Config:
        allow_population_by_field_name = True
