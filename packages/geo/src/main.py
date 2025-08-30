"""FastAPI app exposing hotspot computation."""

from __future__ import annotations

from datetime import datetime

from fastapi import FastAPI
from pipeline.hotspots import compute_hotspots
from pydantic import BaseModel, Field


class Point(BaseModel):
    lat: float
    lon: float
    ts: datetime = Field(description="ISO timestamp")


class HotspotsRequest(BaseModel):
    points: list[Point]
    res: int = Field(ge=0, le=15)
    decayHalfLifeMins: float = Field(default=60.0, gt=0)


class HotspotCell(BaseModel):
    h3: str
    score: float


class HotspotsResponse(BaseModel):
    cells: list[HotspotCell]


app = FastAPI(title="IntelGraph Geo Service")


@app.post("/hotspots/h3", response_model=HotspotsResponse)
async def hotspots(req: HotspotsRequest) -> HotspotsResponse:
    cells = compute_hotspots([p.model_dump() for p in req.points], req.res, req.decayHalfLifeMins)
    return HotspotsResponse(cells=[HotspotCell(**c) for c in cells])


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
