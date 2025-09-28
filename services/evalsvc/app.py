from fastapi import FastAPI, Body, Depends, HTTPException
from evals.agentic.harness import AgenticEvalHarness
from services.evalsvc.db import save_record, get_records, get_records_summary # Added get_records_summary
from evals.agentic.pii_scrubber import scrub_pii
from services.evalsvc.auth import require_role # Import require_role

app = FastAPI()

@app.post("/eval/{runbook}")
async def eval_once(runbook: str, case: dict = Body(...), 
                    # Only admins can trigger evaluations
                    auth_ok: bool = Depends(require_role("agentic-admin"))):
    h = AgenticEvalHarness(runbook)
    rec = h.evaluate_case(case)
    
    # Explicitly scrub PII before saving to the database
    scrubbed_rec = rec.copy(deep=True)
    for step in scrubbed_rec.steps:
        step.input = scrub_pii(step.input)
        step.output = scrub_pii(step.output)

    save_record(scrubbed_rec)
    return rec.dict() # Return the original (unscrubbed) record for immediate response

@app.get("/eval/records")
async def list_records(limit: int = 100, 
                       # Only admins can view raw records
                       auth_ok: bool = Depends(require_role("agentic-admin"))):
    return [r.dict() for r in get_records(limit=limit)]

@app.get("/eval/summary")
async def get_summary_endpoint(workflow: str, since_ms: int, 
                               # Analysts and viewers can see summaries
                               auth_ok: bool = Depends(require_role("agentic-admin", "analyst", "viewer"))):
    # This endpoint will use the get_records_summary from db.py
    # The actual aggregation logic is in graphql/resolvers.py for GraphQL queries
    # For a REST endpoint, we'd need to duplicate some aggregation logic or call the resolver.
    # For simplicity, let's assume get_records_summary will provide a basic summary.
    summary_data = get_records_summary(workflow=workflow, since_ms=since_ms)
    return summary_data
