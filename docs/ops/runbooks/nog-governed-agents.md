# NOG Governed Agents — Operations Runbook

## Summit Readiness Assertion
This runbook operates under the Summit Readiness Assertion and the Constitution of the Ecosystem.

## Purpose
Operate the governed narrative risk ops loop in **report-only** mode with deny-by-default
controls and auditable outputs.

## Preconditions
- `NARRATIVE_OPS_ENABLED=false` by default.
- Policy engine configured and reachable.
- Audit log storage configured and verified.

## Runbook: Report-Only Mode
1. Verify feature flag is disabled for action execution.
2. Ingest signals into NOG with lifecycle labels.
3. Run forecast and counterfactual simulation.
4. Evaluate policy decisions (deny-by-default).
5. Emit recommendation report and evidence artifacts.
6. Append audit events and verify hash-chain.

## Evidence Artifacts
- `nog.snapshot.json`
- `forecast.json`
- `counterfactuals.json`
- `policy_decisions.json`
- `audit.events.jsonl`
- `metrics.json`
- `stamp.json` (git SHA + evidence IDs; no timestamps)

## Alerts & On-Call Signals
- **Drift detector failure** (policy or schema drift).
- **Policy evaluation errors** (engine unavailable or invalid policy).
- **Audit hash-chain verification failures**.
- **Evidence bundle missing artifacts**.

## SLO Assumptions
- **Report run success**: 99% over 7-day rolling window (Intentionally constrained).

## Incident Response
- If policy evaluation fails: halt outputs and raise severity to on-call.
- If audit hash-chain fails: quarantine outputs and initiate integrity review.
- If drift detector fails: block changes and notify governance.

## Drift Detection
- Monitor policy file hashes, default allow-lists, schema changes, and audit event versions.
- Escalate on any unauthorized change.

## MAESTRO Security Alignment
- **MAESTRO Layers**: Agents, Tools, Observability, Security.
- **Threats Considered**: Tool abuse, policy drift, audit tampering.
- **Mitigations**: Report-only defaults, drift detection, hash-chain verification, alerting.
