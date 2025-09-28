from typing import List, Optional
from .schemas import EvalRecord, StepResult
from .pii_scrubber import scrub_pii

def persist_record(rec: EvalRecord):
    # Create a scrubbed copy of the record for persistence
    scrubbed_rec = rec.copy(deep=True) # Use deep=True to ensure nested objects are copied
    
    # Scrub PII from input and output of each step
    for step in scrubbed_rec.steps:
        step.input = scrub_pii(step.input)
        step.output = scrub_pii(step.output)

    # Placeholder for actual persistence (e.g., to Postgres as defined later)
    print(f"Telemetry: Persisting EvalRecord {scrubbed_rec.run_id} (scrubbed)")
    # In a real system, this would call db.save_record(scrubbed_rec)

def compute_first_failure(steps: List[StepResult]) -> Optional[str]:
    for step in steps:
        if not step.ok:
            return step.step_id
    return None

def cost_of(steps: List[StepResult]) -> float:
    return sum(s.cost_usd for s in steps)