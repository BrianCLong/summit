"""FastAPI application exposing anomaly detection endpoints."""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from .detectors import DetectorConfig, score_records

app = FastAPI(title="Anomaly Service")

# in-memory registry of detector configs
_DETECTORS: dict[str, DetectorConfig] = {}


class ConfigRequest(BaseModel):
    configs: list[DetectorConfig]


class ScoreRequest(BaseModel):
    model_id: str
    records: list[dict[str, float]]
    threshold: float | None = None


@app.post("/anomaly/config")
def configure(req: ConfigRequest) -> dict[str, int]:
    for cfg in req.configs:
        _DETECTORS[cfg.model_id] = cfg
    return {"count": len(req.configs)}


@app.post("/anomaly/score")
def score(req: ScoreRequest) -> dict[str, list]:
    config = _DETECTORS.get(req.model_id)
    if not config:
        raise HTTPException(status_code=404, detail="model not found")
    scores, rationales = score_records(req.records, config)
    threshold = req.threshold if req.threshold is not None else config.params.get("threshold", 1.0)
    anomalies = []
    for idx, s in enumerate(scores):
        if s > threshold:
            anomalies.append(
                {
                    "index": idx,
                    "score": s,
                    "rationale": {
                        "path": req.records[idx].get("path"),
                        "features": rationales[idx],
                    },
                }
            )
    return {"scores": scores, "anomalies": anomalies}
