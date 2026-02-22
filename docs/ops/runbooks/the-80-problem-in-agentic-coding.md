# Runbook: “Why did my PR fail agentic guardrails?”

## Purpose
Provide deterministic remediation steps for guardrails failures tied to the Agentic Verification
Standard (The 80% Problem).

## Immediate Triage
1. Identify the guardrails failure reason in CI output.
2. Confirm whether `AGENTIC_GUARDRAILS_ENFORCE=1` is enabled for the run.
3. Locate `artifacts/agentic_guardrails/report.json` for the failing rule.

## Common Failure Modes & Remediations
### 1) PR Size Budget Exceeded
- **Signal**: `MAX_PR_LINES` exceeded.
- **Remediation**:
  - Split the PR by workflow step (Investigation → Entities → Relationships → Copilot → Results).
  - Ship a minimal slice first; follow with incremental PRs.

### 2) Evidence Missing for Sensitive Paths
- **Signal**: Security-sensitive path touched without evidence.
- **Remediation**:
  - Add `evidence/<EVID>.json` with required fields.
  - Ensure `security_impact` and `assumptions[]` are present when risk score ≥ threshold.

### 3) Tests Missing / Not Applicable
- **Signal**: No new/updated tests and no justification.
- **Remediation**:
  - Add targeted tests for the change, or
  - Provide `tests.not_applicable_reason` in evidence with explicit rationale.

### 4) Secret/PII Detected in Evidence
- **Signal**: Secret scanning blocked artifacts.
- **Remediation**:
  - Remove sensitive content; re-run with redaction.
  - Validate against the never-log list in the data handling standard.

## SLO & Reliability Targets
- Guardrails job flake rate < 1% over rolling 30 days.
- Job runtime < 30s in CI; local runtime < 5s best-effort.
- Artifact size `report.json` ≤ 256KB.

## Escalation Path
If remediation is blocked, open a governance ticket with:
- Failing rule name
- Evidence artifact path
- Proposed mitigation and rollback plan

## MAESTRO Alignment
- **MAESTRO Layers**: Tools, Observability, Security.
- **Threats Considered**: review bypass, evidence omission, secret leakage.
- **Mitigations**: gate enforcement, deterministic artifacts, secret scanning.

## Final State
Guardrails must be green or explicitly waived through governance-approved exception records.
