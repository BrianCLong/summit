from fastapi import FastAPI, HTTPException
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional
import uvicorn
import time
from src.decision_core import DecisionCore
from src.roi_engine import ROIEngine
from src.gov_shield import GovShield

app = FastAPI(title="SummitROIForge", version="1.0.0")

# Initialize Components
decision_core = DecisionCore()
roi_engine = ROIEngine()
gov_shield = GovShield()

class TransactionRequest(BaseModel):
    transaction_id: str
    amount: float
    data: Dict[str, Any]
    tenant_id: str

class TransactionResponse(BaseModel):
    status: str
    decision_trace: Dict[str, Any]
    governance_result: Dict[str, Any]
    metrics: Dict[str, Any]

@app.post("/process", response_model=TransactionResponse)
async def process_transaction(request: TransactionRequest):
    # 1. Governance Scan (Pre-Process)
    gov_result = gov_shield.scan_for_bias(request.data)
    if gov_result["biased"]:
        # In strict mode, we might reject. For now, we flag.
        pass

    # 2. Decision Core Execution
    # Inject gov results into context
    context = request.data.copy()
    context["governance_check"] = gov_result

    start_time = time.time()
    decision_result = decision_core.run_workflow(context)
    end_time = time.time()

    # 3. ROI Engine Update
    duration_ms = (end_time - start_time) * 1000
    # Simulate cost savings calculation (e.g., automated vs human cost)
    estimated_human_cost = 5.00 # $5 per manual review
    actual_compute_cost = 0.01
    savings = estimated_human_cost - actual_compute_cost

    roi_engine.record_transaction(duration_ms, savings)

    # 4. Audit Logging
    gov_shield.log_audit_event("TRANSACTION_PROCESSED", {
        "id": request.transaction_id,
        "decision": decision_result,
        "roi_metrics": roi_engine.get_metrics()
    })

    return {
        "status": "completed",
        "decision_trace": decision_result,
        "governance_result": gov_result,
        "metrics": roi_engine.get_metrics()
    }

@app.get("/metrics", response_class=PlainTextResponse)
async def get_metrics():
    return roi_engine.generate_prometheus_metrics()

@app.get("/health")
async def health():
    return {"status": "healthy", "system": "SummitROIForge"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
