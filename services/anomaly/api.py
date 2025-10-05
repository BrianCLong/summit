"""FastAPI application exposing anomaly detection endpoints."""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .detectors import DetectorConfig
from .engine import AnomalyEngine

app = FastAPI(title="Anomaly Service", version="2.0")

engine = AnomalyEngine()


class ConfigRequest(BaseModel):
    configs: list[DetectorConfig]


class ScoreRequest(BaseModel):
    model_id: str
    records: list[dict[str, float]]
    threshold: float | None = None
    labels: list[int] | None = None
    horizon: int = Field(default=3, ge=0, le=48)


@app.post("/anomaly/config")
def configure(req: ConfigRequest) -> dict[str, int]:
    count = engine.configure(req.configs)
    return {"count": count}


@app.post("/anomaly/score")
def score(req: ScoreRequest) -> dict[str, object]:
    try:
        result = engine.score(
            model_id=req.model_id,
            records=req.records,
            threshold_override=req.threshold,
            labels=req.labels,
            prediction_horizon=req.horizon,
        )
    except KeyError as exc:  # pragma: no cover - FastAPI handles path
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return result


@app.get("/anomaly/alerts")
def get_alerts() -> dict[str, list[dict[str, object]]]:
    alerts = [incident.to_dict() for incident in engine.alert_client.events]
    return {"alerts": alerts}
