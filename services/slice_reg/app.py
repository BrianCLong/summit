"""FastAPI service exposing the slice registry primitives."""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, List, Mapping

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from .registry import SliceRegistry, SliceVersion


class SlicePayload(BaseModel):
    version: str
    members: List[str]
    metadata: Mapping[str, object] = Field(default_factory=dict)
    source: str | None = None

    @field_validator("version")
    @classmethod
    def version_not_empty(cls, value: str) -> str:
        if not value:
            raise ValueError("version must be provided")
        return value

    @field_validator("members")
    @classmethod
    def members_not_empty(cls, members: List[str]) -> List[str]:
        if not members:
            raise ValueError("members cannot be empty")
        return members


class TrafficEvent(BaseModel):
    id: str
    label: str = "unknown"
    weight: float = 1.0


class CoverageRequest(BaseModel):
    traffic_events: List[TrafficEvent]

    def as_iterable(self) -> Iterable[Mapping[str, object]]:
        for event in self.traffic_events:
            yield event.model_dump()


class SliceResponse(BaseModel):
    name: str
    version: str
    members: List[str]
    metadata: Mapping[str, object]
    created_at: datetime
    source: str | None
    membership_hash: str
    provenance_hash: str
    cardinality: int


class DiffResponse(BaseModel):
    slice: str
    baseline: str
    candidate: str
    added: List[str]
    removed: List[str]
    unchanged: List[str]


class CoverageResponse(BaseModel):
    slice: SliceResponse
    traffic_total: float
    captured_weight: float
    coverage: float
    label_totals: Mapping[str, float]
    captured_by_label: Mapping[str, float]
    label_coverage: Mapping[str, float]


def get_registry() -> SliceRegistry:
    storage_dir = Path(__file__).resolve().parent / "store"
    return SliceRegistry(storage_dir)


def create_app() -> FastAPI:
    app = FastAPI(title="Slice Registry", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.post("/slices/{name}", response_model=SliceResponse)
    def upsert_slice(name: str, payload: SlicePayload, registry: SliceRegistry = Depends(get_registry)) -> SliceResponse:
        slice_version = SliceVersion(
            name=name,
            version=payload.version,
            members=payload.members,
            metadata=payload.metadata,
            created_at=datetime.now(tz=timezone.utc),
            source=payload.source,
        )
        registry.upsert(slice_version)
        return SliceResponse(**slice_version.as_dict())

    @app.get("/slices/{name}/{version}", response_model=SliceResponse)
    def get_slice(name: str, version: str, registry: SliceRegistry = Depends(get_registry)) -> SliceResponse:
        try:
            slice_version = registry.get(name, version)
        except KeyError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error
        return SliceResponse(**slice_version.as_dict())

    @app.get("/slices/{name}/{baseline}/diff/{candidate}", response_model=DiffResponse)
    def diff_slice(
        name: str,
        baseline: str,
        candidate: str,
        registry: SliceRegistry = Depends(get_registry),
    ) -> DiffResponse:
        try:
            diff_result = registry.diff(name, baseline, candidate)
        except KeyError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error
        return DiffResponse(**diff_result)

    @app.post("/slices/{name}/{version}/coverage", response_model=CoverageResponse)
    def coverage(
        name: str,
        version: str,
        request: CoverageRequest,
        registry: SliceRegistry = Depends(get_registry),
    ) -> CoverageResponse:
        try:
            coverage_result = registry.compute_coverage(name, version, request.as_iterable())
        except KeyError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error
        return CoverageResponse(**coverage_result)

    @app.get("/slices/{name}", response_model=List[SliceResponse])
    def list_versions(name: str, registry: SliceRegistry = Depends(get_registry)) -> List[SliceResponse]:
        versions = registry.list_versions(name)
        return [SliceResponse(**slice_version.as_dict()) for slice_version in versions]

    return app


app = create_app()
