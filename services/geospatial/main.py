from __future__ import annotations

from hashlib import md5
from time import time

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from shapely.geometry import Point, Polygon
from sklearn.cluster import DBSCAN

app = FastAPI()

CACHE: dict[str, dict] = {}
EVENTS: list[tuple[str, dict]] = []

RATE_LIMIT = 100
WINDOW = 60
REQUEST_LOG: dict[str, list[float]] = {"geofence": [], "cluster": [], "trajectory": []}


def _hash(data: dict) -> str:
    import json

    return md5(json.dumps(data, sort_keys=True).encode()).hexdigest()


def _cache_get(name: str, data: dict):
    return CACHE.get(_hash({"name": name, "data": data}))


def _cache_set(name: str, data: dict, value: dict):
    CACHE[_hash({"name": name, "data": data})] = value


def _rate_limited(name: str):
    now = time()
    recent = [t for t in REQUEST_LOG[name] if now - t < WINDOW]
    REQUEST_LOG[name] = recent
    if len(recent) >= RATE_LIMIT:
        raise HTTPException(status_code=429, detail="rate limit exceeded")
    REQUEST_LOG[name].append(now)


def publish_event(topic: str, payload: dict):
    EVENTS.append((topic, payload))


class GeofenceRequest(BaseModel):
    point: list[float]
    fences: list[list[list[float]]]
    crs: str = "EPSG:4326"


class GeofenceResponse(BaseModel):
    inside: bool
    fences: list[int]


class ClusterRequest(BaseModel):
    points: list[list[float]]
    eps: float = 0.01
    min_samples: int = 5


class ClusterResponse(BaseModel):
    clusters: list[list[int]]
    stats: dict[str, int]


class TrajectoryPoint(BaseModel):
    lon: float
    lat: float
    ts: float


class TrajectoryRequest(BaseModel):
    points: list[TrajectoryPoint]
    gap_threshold: float = 60.0


class TrajectoryResponse(BaseModel):
    tracks: list[list[TrajectoryPoint]]
    gaps: list[int]


def _ensure_crs(crs: str):
    if crs != "EPSG:4326":
        raise HTTPException(status_code=400, detail="unsupported crs")


@app.post("/geo/geofence/check", response_model=GeofenceResponse)
def geofence_check(req: GeofenceRequest):
    _rate_limited("geofence")
    _ensure_crs(req.crs)
    cached = _cache_get("geofence", req.model_dump())
    if cached:
        return cached
    point = Point(req.point[0], req.point[1])
    inside = []
    for idx, fence in enumerate(req.fences):
        poly = Polygon(fence)
        if poly.contains(point):
            inside.append(idx)
            publish_event("alerts.geo.v1", {"fence": idx, "event": "enter"})
    result = GeofenceResponse(inside=bool(inside), fences=inside)
    _cache_set("geofence", req.model_dump(), result.model_dump())
    return result


@app.post("/geo/cluster", response_model=ClusterResponse)
def cluster(req: ClusterRequest):
    _rate_limited("cluster")
    cached = _cache_get("cluster", req.model_dump())
    if cached:
        return cached
    if not req.points:
        result = ClusterResponse(clusters=[], stats={"clusters": 0})
        _cache_set("cluster", req.model_dump(), result.model_dump())
        return result
    clustering = DBSCAN(eps=req.eps, min_samples=req.min_samples).fit(req.points)
    labels = clustering.labels_
    clusters: dict[int, list[int]] = {}
    for i, label in enumerate(labels):
        clusters.setdefault(label, []).append(i)
    clusters_list = [v for k, v in clusters.items() if k != -1]
    result = ClusterResponse(clusters=clusters_list, stats={"clusters": len(clusters_list)})
    _cache_set("cluster", req.model_dump(), result.model_dump())
    return result


@app.post("/geo/trajectory", response_model=TrajectoryResponse)
def trajectory(req: TrajectoryRequest):
    _rate_limited("trajectory")
    cached = _cache_get("trajectory", req.model_dump())
    if cached:
        return cached
    pts = sorted(req.points, key=lambda p: p.ts)
    tracks: list[list[TrajectoryPoint]] = []
    gaps: list[int] = []
    current: list[TrajectoryPoint] = []
    for i, pt in enumerate(pts):
        if current and pt.ts - current[-1].ts > req.gap_threshold:
            tracks.append(current)
            gaps.append(i)
            current = []
        current.append(pt)
    if current:
        tracks.append(current)
    result = TrajectoryResponse(tracks=tracks, gaps=gaps)
    _cache_set("trajectory", req.model_dump(), result.model_dump())
    return result
