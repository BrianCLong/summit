# Evidence Schema

## Purpose
Defines the rigid structure of evidence required for Summit to evaluate a decision. Incomplete evidence results in an automatic "Refusal" or "Insufficient Evidence" state.

## Core Schema Structure

```json
{
  "decision_id": "UUID",
  "timestamp": "ISO8601",
  "decision_type": "CONTAINMENT_APPROVAL | RESPONSE_GATING | ...",
  "actor": {
    "user_id": "string",
    "role": "string",
    "source_system": "string"
  },
  "context": {
    "incident_id": "string",
    "affected_assets": ["list of asset IDs"],
    "severity_claimed": "LOW | MED | HIGH | CRITICAL"
  },
  "evidence_artifacts": [
    {
      "type": "LOG_SNIPPET | ALERT_JSON | SCREENSHOT | TICKET_LINK",
      "source": "Splunk | Jira | CrowdStrike | ...",
      "url": "string",
      "hash": "SHA256 (for integrity)",
      "description": "string"
    }
  ],
  "policy_checks": {
    "policy_id": "string",
    "status": "PASS | FAIL | WAIVE",
    "details": "string"
  },
  "summit_evaluation": {
    "outcome": "APPROVED | REFUSED | DEFERRED",
    "confidence_score": 0.0 - 1.0,
    "risk_factors": ["list of identified risks"],
    "reasoning": "Natural language explanation of the decision"
  }
}
```

## Field Definitions

### Evidence Artifacts
Must be verifiable. A link to a dashboard is weak evidence. A snapshot of the log or a specific query result is strong evidence.
* **Required for Containment:** 2+ independent indicators (e.g., Endpoint Alert + Network Log).
* **Required for Escalation:** Match against "Critical Criteria" policy.

### Summit Evaluation
* **Outcome:** The binding decision state.
* **Confidence Score:** Internal metric (0-1) indicating how strongly the evidence supports the decision.
    * < 0.7: Automatic Human Review required.
    * > 0.9: Auto-Approval candidate (Phase 3+).
* **Risk Factors:** Tags indicating why a decision is risky (e.g., "Critical Asset", "Friday Afternoon", "No Prior History").

## Audit Trail
This JSON blob is immutable once finalized. It is stored in the `ProvenanceLedger` and serves as the primary artifact for post-incident reviews and external audits.
