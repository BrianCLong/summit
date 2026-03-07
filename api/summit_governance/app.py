from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
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
    import os
    if not os.path.exists(req.path):
        raise HTTPException(status_code=404, detail="File not found")

    intent_dict = extract_intent(req.path)
    intent = Intent.model_validate(intent_dict)

    metrics_dict = compute_metrics(req.path)
    metrics = ExplainMetrics.model_validate(metrics_dict)

    report = build_explanation(path=req.path, intent=intent, metrics=metrics)

    # Optionally write bundle here, or just return JSON via API
    from summit.artifacts.writer import write_explain_bundle
    write_explain_bundle(path=req.path, report=report, metrics=metrics)

    return ExplainResponse(report=report, metrics=metrics)
