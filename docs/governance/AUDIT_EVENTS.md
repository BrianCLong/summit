# Governance Audit Event Definitions

This document defines the schema and semantics for new audit event types associated with continuous compliance, authenticity verification, and human accountability.

## 1. Compliance Drift Event
**Type:** `DecisionNode`
**SubType:** `ComplianceDrift`
**Description:** Recorded when the continuous compliance monitor detects a discrepancy between a defense action and the current governance policy.

### Schema
```json
{
  "eventId": "UUID",
  "type": "Decision",
  "subType": "ComplianceDrift",
  "result": "DENY",
  "metadata": {
    "firstPolicyBundleHash": "SHA-256",
    "secondPolicyBundleHash": "SHA-256",
    "affectedActionType": "string",
    "driftDetectedAt": "ISO8601",
    "safeModeTriggered": true
  }
}
```

## 2. Authenticity Evaluation Signal
**Type:** `DecisionNode`
**SubType:** `AuthenticityEvaluation`
**Description:** Recorded when an artifact referenced by a candidate defense action is evaluated for authenticity and provenance.

### Schema
```json
{
  "eventId": "UUID",
  "type": "Decision",
  "subType": "AuthenticityEvaluation",
  "result": "ALLOW | DENY | FLAG",
  "confidence": 0.0-1.0,
  "metadata": {
    "artifactId": "string",
    "watermarkStatus": "present | absent | invalid | unknown",
    "provenanceChainCompleteness": 0.0-1.0,
    "explanation": "string"
  }
}
```

## 3. Human Approval Artifact (Checklist)
**Type:** `ActionNode`
**SubType:** `HumanApproval`
**Description:** Recorded when an operator completes a mandatory review checklist for an external publishing defense action.

### Schema
```json
{
  "eventId": "UUID",
  "type": "Action",
  "subType": "HumanApproval",
  "status": "COMPLETED",
  "metadata": {
    "approvalToken": "string",
    "operatorId": "string",
    "checklist": {
      "attributionPresent": true,
      "uncertaintyPresent": true,
      "integrityVerified": true
    },
    "notes": "string (redacted)",
    "reviewLoadAtApproval": "number"
  }
}
```
