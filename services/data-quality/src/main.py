"""FastAPI entrypoint for the data quality microservice."""

from __future__ import annotations

from fastapi import FastAPI, HTTPException

from .models import EvaluationRequest, Finding, QuarantineItem, Rule
from .rule_engine import evaluate

app = FastAPI(title="Data Quality Service", version="0.1.0")

RULES: dict[str, Rule] = {}
QUARANTINE: list[QuarantineItem] = []


@app.post("/dq/rules", response_model=Rule)
def create_rule(rule: Rule) -> Rule:
    """Register a rule in the in-memory rule catalog."""
    RULES[rule.id] = rule
    return rule


@app.get("/dq/rules", response_model=list[Rule])
def list_rules() -> list[Rule]:
    """Return all registered rules."""
    return list(RULES.values())


@app.post("/dq/rules/validate")
def validate_rule(rule: Rule) -> dict[str, str]:
    """Perform lightweight schema validation for a proposed rule."""
    return {"status": "valid", "ruleId": rule.id}


@app.delete("/dq/rules/{rule_id}")
def delete_rule(rule_id: str) -> dict[str, str]:
    """Delete a rule if it exists, otherwise raise a 404 error."""
    if rule_id in RULES:
        del RULES[rule_id]
        return {"status": "deleted", "ruleId": rule_id}
    raise HTTPException(status_code=404, detail="rule not found")


@app.post("/dq/evaluate", response_model=list[Finding])
def evaluate_payload(req: EvaluationRequest) -> list[Finding]:
    """Evaluate a payload against registered rules and quarantine failures."""
    findings = evaluate(req)
    if findings:
        item = QuarantineItem(
            id=str(len(QUARANTINE) + 1), payload=req.payload, reason="rule violation"
        )
        item.seal(QUARANTINE[-1] if QUARANTINE else None)
        QUARANTINE.append(item)
    return findings


@app.post("/dq/quarantine/retry")
def quarantine_retry(item_id: str) -> dict[str, str]:
    """Requeue a quarantined payload for another evaluation."""
    for i, item in enumerate(QUARANTINE):
        if item.id == item_id:
            QUARANTINE.pop(i)
            return {"status": "retried"}
    raise HTTPException(status_code=404, detail="item not found")


@app.post("/dq/quarantine/drop")
def quarantine_drop(item_id: str, reason: str) -> dict[str, str]:
    """Drop a quarantined payload and capture the supplied reason."""
    for i, item in enumerate(QUARANTINE):
        if item.id == item_id:
            QUARANTINE.pop(i)
            return {"status": "dropped", "reason": reason}
    raise HTTPException(status_code=404, detail="item not found")
