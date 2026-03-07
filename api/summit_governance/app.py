from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
from pathlib import Path

from summit.kernel.intent.extractor import extract_intent
from summit.kernel.trust.maintainability import compute_metrics
from summit.llm.explain import build_explanation
from summit.schemas.explanation import ExplanationReport, ExplainMetrics, Intent

app = FastAPI(title="Summit Governance API", version="0.1.0")

class ExplainRequest(BaseModel):
    path: str

class ExplainResponse(BaseModel):
    report: ExplanationReport
    metrics: ExplainMetrics

@app.post("/api/v1/explain", response_model=ExplainResponse)
def explain_endpoint(req: ExplainRequest):
    # Security: Ensure path is within the allowed workspace and not doing traversal
    # A simple way to prevent external reads:
    abs_path = os.path.abspath(req.path)
    workspace_root = os.path.abspath(os.getcwd())

    if not abs_path.startswith(workspace_root):
        raise HTTPException(status_code=403, detail="Access denied. Path is outside of workspace.")

    if not os.path.isfile(abs_path):
        raise HTTPException(status_code=404, detail="File not found")

    intent_dict = extract_intent(abs_path)
    intent = Intent.model_validate(intent_dict)

    metrics_dict = compute_metrics(abs_path)
    metrics = ExplainMetrics.model_validate(metrics_dict)

    report = build_explanation(path=abs_path, intent=intent, metrics=metrics)

    from summit.artifacts.writer import write_explain_bundle
    write_explain_bundle(path=abs_path, report=report, metrics=metrics)

    return ExplainResponse(report=report, metrics=metrics)
