# Sprint +1 Delivery Plan: Incident Hub + Runbooks + Tenant Console

**Status:** In execution
**Owner:** Codex (Engineer)
**Authority:** Summit Readiness Assertion (binding) and Governance Framework

## Summit Readiness Assertion (Preemptive Escalation)

This sprint is executed under the binding **Summit Readiness Assertion**, with all deviations framed
as **Governed Exceptions** and documented as evidence-first artifacts.

- Authority: `docs/SUMMIT_READINESS_ASSERTION.md`
- Governance: `docs/governance/CONSTITUTION.md`, `docs/governance/META_GOVERNANCE.md`

## Objective

Deliver end-to-end incident operations (declare → triage → runbook execution → evidence) alongside
multi-tenant proof (policy profiles, isolation, usage metering) without violating Golden Path
invariants.

## Scope (Ordered)

1. Incident Hub v1: API + policy gates + receipts + timeline linkage.
2. Runbook Center v1: signed/versioned runbooks, step execution, approvals.
3. Tenant/Partner Console v1: tenant CRUD, policy profiles, role catalogs, evidence export.
4. Metering v0: usage events and tenant usage reporting.

## Out of Scope (Governed Exceptions)

- Full postmortem editor/workflow → **Governed Exception**.
- Multi-region residency → **Governed Exception** (region tags retained in schemas).

## Architecture Summary

### Services & Data

- **Incident Hub Service**: CRUD + state transitions + timeline binding + receipt emission.
- **Runbook Center Service**: versioned, signed runbooks with risk tags.
- **Execution Engine**: idempotent step execution with approvals (OPA/ABAC).
- **Tenant Console**: tenant management, policy profiles, role catalogs.
- **Evidence Export**: signed bundle manifest per tenant/time window.
- **Metering**: usage events (`tenant_id`, `event_type`, `units`, `timestamp`, `request_id`).

### Policy & Governance

- All mutations are policy-gated (OPA/ABAC).
- Policy decisions must be emitted as receipts and included in evidence bundles.

## Acceptance Criteria

- **Incident Hub v1**
  - `POST /incidents`
  - `PATCH /incidents/{id}`
  - `GET /incidents/{id}`
  - `GET /incidents?status=`
  - Timeline filter by incident id.

- **Runbook Center v1**
  - `POST /runbooks/{id}:launch`
  - `POST /run-executions/{id}/steps/{step}:execute`
  - Abort/rollback supported (manual receipts allowed).

- **Tenant Console v1**
  - `POST /tenants`
  - `PATCH /tenants/{id}`
  - `POST /tenants/{id}/policy-profile`
  - Evidence export signed manifest.

- **Metering v0**
  - `usage_events` with tenant attribution ≥95%.
  - `GET /tenants/{id}/usage?from=&to=`

## Evidence & Receipts

- Every mutation emits a receipt with tenant_id, actor, policy decision, and request_id.
- Evidence export bundles receipts, policy decisions, and redaction log.

## Testing & Verification (Golden Path Alignment)

- Unit tests for incident and runbook critical paths.
- Integration tests for policy gating and receipts.
- Smoke tests remain green.

## Observability

- Metrics: policy latency, approval cycle time, receipt verification failures, tenant error rates.
- Logs: immutable receipt trail with request_id correlation.
- Alerts: incident state change failures, approval backlog thresholds.

## MAESTRO Threat Model Alignment

- **MAESTRO Layers**: Foundation, Data, Agents, Tools, Infra, Observability, Security.
- **Threats Considered**: goal manipulation, prompt injection, tool abuse, cross-tenant access.
- **Mitigations**: policy-as-code gating, strict tenant scoping middleware, receipt integrity,
  deterministic execution, and anomaly alerting.

## Rollback Plan

- Feature flags for new endpoints.
- Rollback triggers: policy coverage regression, receipt integrity failure, tenant isolation breach.
- Revert to previous version and replay receipts for verification.

## Innovation (Forward-Leaning Enhancement)

Introduce a **policy-aware execution ledger** that hashes
`tenant_id + policy_decision + step_signature + receipt_id` into an append-only chain to make
exports tamper-evident without increasing storage complexity.

## Timeline Compression

- Week 1: Incident Hub + timeline linkage + receipts.
- Week 2: Runbook execution + approvals + tenant console + evidence export.
- Metering hooks run in parallel with endpoint delivery.

## Finality

This sprint is a governed extension of the Summit readiness posture. All deviations are
**Governed Exceptions** with evidence attached.
