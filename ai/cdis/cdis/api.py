from __future__ import annotations

import logging
from pathlib import Path
from typing import Dict, List, Optional

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .config import FeatureFlag, Settings, get_settings
from .models import InterventionResult
from .service import CausalDiscoveryService
from .storage import get_store

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


class DiscoverRequest(BaseModel):
    records: List[Dict[str, float]]
    algorithm: Optional[str] = Field(default=None, description="notears | pc | granger")


class DiscoverResponse(BaseModel):
    simId: str
    graph: Dict[str, Dict[str, float]]
    confidence: float


class InterventionRequest(BaseModel):
    simId: str
    interventions: Dict[str, float]
    target: Optional[str] = None


class InterventionResponse(BaseModel):
    simId: str
    delta: Dict[str, float]
    projected: Dict[str, float]
    paths: List[Dict[str, object]]
    confidence: float


class ExplainResponse(BaseModel):
    simId: str
    graph: Dict[str, Dict[str, float]]
    confidence: float
    lastIntervention: Optional[InterventionResponse]


def require_feature(settings: Settings = Depends(get_settings)) -> FeatureFlag:  # noqa: B008
    if not settings.feature_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Causal discovery is disabled; set CDIS_FEATURE_ENABLED=true",
        )
    return True


settings = get_settings()
app = FastAPI(title=settings.service_name, version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

ui_dir = Path(__file__).resolve().parent.parent / "ui"
app.mount("/lab", StaticFiles(directory=str(ui_dir), html=True), name="lab")


@app.exception_handler(ValueError)
async def value_error_handler(_: Request, exc: ValueError) -> JSONResponse:
    logger.exception("bad request", exc_info=exc)
    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.post("/discover", response_model=DiscoverResponse, dependencies=[Depends(require_feature)])
def discover(payload: DiscoverRequest) -> DiscoverResponse:
    service = CausalDiscoveryService(store=get_store())
    sim = service.discover(payload.records, payload.algorithm)
    return DiscoverResponse(
        simId=sim.sim_id,
        graph=sim.graph.adjacency(),
        confidence=sim.confidence,
    )


@app.post(
    "/intervene", response_model=InterventionResponse, dependencies=[Depends(require_feature)]
)
def intervene(payload: InterventionRequest) -> InterventionResponse:
    service = CausalDiscoveryService(store=get_store())
    simulation, simulator = service.intervene(payload.simId, payload.interventions, payload.target)
    result: InterventionResult = simulator.intervene(
        sim_id=simulation.sim_id,
        interventions=payload.interventions,
        target=payload.target,
        confidence=simulation.confidence,
        top_k_paths=settings.top_k_paths,
    )
    get_store().record_intervention(result)
    return InterventionResponse(
        simId=result.sim_id,
        delta=result.delta,
        projected=result.projected,
        paths=[{"path": p.path, "contribution": p.contribution} for p in result.paths],
        confidence=result.confidence,
    )


@app.get(
    "/explain/{sim_id}", response_model=ExplainResponse, dependencies=[Depends(require_feature)]
)
def explain(sim_id: str) -> ExplainResponse:
    store = get_store()
    simulation = store.get(sim_id)
    if not simulation:
        raise HTTPException(status_code=404, detail="simulation not found")
    last = store.get_last_intervention(sim_id)
    last_payload = None
    if last:
        last_payload = InterventionResponse(
            simId=last.sim_id,
            delta=last.delta,
            projected=last.projected,
            paths=[{"path": p.path, "contribution": p.contribution} for p in last.paths],
            confidence=last.confidence,
        )
    return ExplainResponse(
        simId=simulation.sim_id,
        graph=simulation.graph.adjacency(),
        confidence=simulation.confidence,
        lastIntervention=last_payload,
    )


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok", "feature": "enabled" if settings.feature_enabled else "disabled"}
