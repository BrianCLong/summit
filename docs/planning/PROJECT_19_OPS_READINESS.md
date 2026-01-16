# Project 19: Operational Readiness (Ops-Ready GA)

**Owner**: Jules
**Priority**: P0
**Status**: In Progress

## Objective
Implement "Ops-Ready GA" by shipping measurable SLOs, observability wiring, incident response playbooks, backup/restore proof, and a production verification gate.

## Workstreams & Deliverables

### 1. SLOs/SLIs + Error Budget Policy
- [x] **Document**: `docs/ops/SLO_POLICY.md` updated with Job Freshness.
- [x] **Schema**: `schemas/ops/slo_policy.schema.json` created.
- [x] **Machine Policy**: `docs/ops/slo_policy.yml` created.
- [x] **Validation**: `scripts/ops/validate_slo_policy.ts` implemented and passing.

### 2. Observability "Minimum Viable"
- [x] **Baseline Doc**: `docs/ops/OBSERVABILITY_BASELINE.md` created.
- [x] **Validation**: `scripts/ops/validate_observability.ts` implemented and passing.
- [x] **Evidence**: `artifacts/observability/report.json` generation confirmed.

### 3. Incident Response + On-Call
- [x] **Playbook**: `docs/ops/INCIDENT_PLAYBOOK.md` created with Severity Model.
- [x] **Index**: `docs/ops/RUNBOOK_INDEX.md` created.
- [x] **Sanity Check**: `scripts/ops/incident_sanity_check.ts` implemented and passing.

### 4. Backup/Restore + DR Proof
- [x] **Procedures**: `docs/ops/BACKUP_RESTORE.md` created.
- [x] **Drill Guide**: `docs/ops/DR_DRILL.md` created.
- [x] **Plan Check**: `scripts/ops/backup_plan_check.ts` implemented and passing.

### 5. Production Verification Gate
- [x] **CI Workflow**: `.github/workflows/prod-verify.yml` created.

## Definition of Done (DoD)
*   All validation scripts pass.
*   CI workflow is active.
*   Documentation matches the implementation.
*   Evidence artifacts are produced deterministically.
