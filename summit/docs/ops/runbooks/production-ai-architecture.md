# Production Architecture Ops & Runbooks

**Evidence Prefix:** PAB

This document describes the operational assumptions, SLO targets, and incident response runbooks associated with the Summit Production AI Architecture. It ensures the platform remains highly available, resilient, and observable according to our documented architecture.

## Alerts & Failure Modes

### Alert: Undocumented Architecture Drift
**Evidence ID:** PAB-OPS-AL-001
- **Trigger:** A PR introduces a new component path (`services/`, `scripts/`, `docs/blueprints/`, etc.) that is not documented in the `production-ai-architecture.md` blueprint.
- **Impact:** The PR is blocked by the CI drift detector.
- **Runbook:** The developer must review the drift report (`report.json`) and update the blueprint to document the new component mapping.

### Alert: Evidence Artifact Missing
**Evidence ID:** PAB-OPS-AL-002
- **Trigger:** An expected artifact (`metrics.json`, `stamp.json`, `report.json`) fails generation or schema validation during CI.
- **Impact:** The build fails, preventing deployment of unverified changes.
- **Runbook:** Inspect the CI logs to determine the cause of generation failure (e.g., deterministic formatting issue, missing file path). Re-run the drift detector locally.

### Alert: Provenance Field Regression
**Evidence ID:** PAB-OPS-AL-003
- **Trigger:** A graph write operation or documented requirement is missing its mandatory `PAB-*` evidence ID or valid `claim_cid`.
- **Impact:** The epistemic immune system (EIS) or CI gate rejects the commit or payload.
- **Runbook:** Review the offending payload or documentation section and ensure the required bitemporal claims and evidence IDs are present.

### Alert: Cost Budget Regression in CI
**Evidence ID:** PAB-OPS-AL-004
- **Trigger:** A fixture or agent simulation exceeds its predefined token/cost threshold.
- **Impact:** The test suite fails.
- **Runbook:** Investigate the specific agent loop or query. Implement stricter max-tokens, early stopping criteria, or optimize the prompt.

## Operator Action Ladder

**Evidence ID:** PAB-OPS-OAL-001
1. **Triage:** Acknowledge the alert and identify the affected architecture plane.
2. **Investigate:** Consult the telemetry dashboards (`observability.py`) and specific drift logs.
3. **Mitigate:** Apply the relevant runbook or, if necessary, initiate a rollback.
4. **Resolve:** Commit the fix (e.g., updating the blueprint, fixing the schema, adjusting the budget).
5. **Post-Mortem:** Document the incident if SLOs were breached.

## Rollback Procedure

**Evidence ID:** PAB-OPS-RBP-001
If a merged PR introduces unexpected architectural drift or breaks a critical production plane:
1. Identify the offending PR number from the deployment logs or CI history.
2. Revert the PR via GitHub (`git revert <merge-commit-sha>`).
3. Ensure the drift detector and schema validators pass on the revert branch.
4. Merge the revert branch to restore the system to its previous known-good state.

## SLO / SLA Assumptions

**Evidence ID:** PAB-OPS-SLO-001
- **Blueprint Drift Check Success Rate:** ≥ 99% on the default branch.
- **Mean Time to Classify Drift:** < 1 business day (for undocumented components detected in a PR).
- **Mean Time to Revert Bad Blueprint Gate:** < 30 minutes.

### Performance & Cost Budgets
**Evidence ID:** PAB-OPS-BUDGET-001
- **Edge request p95 for metadata-only flows:** < 500 ms.
- **Retrieval-augmented path p95:** < 2.5 s.
- **Async orchestration enqueue latency p95:** < 150 ms.
- **Drift detector runtime in CI:** < 60 s.
- **Memory for drift detector job:** < 512 MB.
- CI drift job should be CPU-only, with no LLM calls.
- Artifact size budget: < 1 MB total for `report.json`, `metrics.json`, `stamp.json`.

## Escalation Owner Mapping

**Evidence ID:** PAB-OPS-ESC-001
- **Ingress Plane:** API Platform Team
- **Agent Control / Workflow Plane:** Agentic OS Team
- **Knowledge / Ingest Plane:** Data Platform Team
- **Model Plane:** ML Infrastructure Team
- **Security / Governance Plane:** Security & Compliance Team
