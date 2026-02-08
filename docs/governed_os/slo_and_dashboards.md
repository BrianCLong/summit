# SLOs and Dashboards

## Purpose
The Governed OS exposes auditor-facing and operator-facing SLOs that are continuously validated
and observable. These SLOs are the operational moat: they transform governance posture into a
measurable, enforceable, and auditable guarantee.

## Core SLOs

1. **Auditor Verify Latency**
   - Target: < 20 seconds (reference environment)
   - Scope: auditor verify workflow from request → validated evidence stamp

2. **Citation Resolution Rate**
   - Target: 100% for exported artifacts
   - Scope: all citations resolve to evidence hashes

3. **Deterministic Replay Integrity**
   - Target: hash-identical `metrics.json` in replay
   - Scope: policy + model + dataset fingerprints match the original

4. **Policy Drift Detection**
   - Target: policy change emits diff + approval stamp
   - Scope: no unapproved policy change is applied

## Dashboard Requirements

Dashboards are tenant-scoped and residency-aware.

- **Compliance Posture Dashboard**
  - SLO health for auditor verify, citation resolution, replay integrity
  - Policy drift alerts with diff summaries
  - Evidence bundle freshness and completeness

- **Audit Trail Dashboard**
  - Approval DAG timing and completion
  - Exception justifications and governed exceptions
  - Evidence stamp coverage by workflow

## CI Gates

- `ci/slo-budgets`: verifies auditor verify latency budget.
- `ci/citations-resolve`: enforces 100% citation resolution.
- `ci/policy-compile`: rejects ambiguous rule overlaps.

## Runbook Expectations

- Every SLO breach produces a deterministic evidence bundle.
- Remediation is tracked with policy explainability artifacts.
- All actions are recorded in CompanyOS operational memory.

## Status

SLOs and dashboards are defined as part of the Governed OS epic and anchored to the Summit
Readiness Assertion.
