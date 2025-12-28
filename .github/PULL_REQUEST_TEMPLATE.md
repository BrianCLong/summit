## Summary

[What/why]

## Frontend Governance Intake (required if touching frontend paths)

- **Change class (0-4)**:
- **Risk level (low/medium/high)**:
- **Affected surfaces**:
- **GA-locked files touched? (yes/no)**:
- **Feature flag or safe-staging plan**:
- **Approvals/labels applied**: frontend/governance-approved, compliance/claims-approved, compliance/ethics-approved, frontend/emergency-exception

## M&A / Integration Readiness (DD Signal)

_If this PR involves integrating an external system or library:_

- **DD Signal**: [Link to DD Scorecard or "N/A"]
- **Risk/Cost**: [Estimated Risk Delta & Integration Cost]
- **Control/Pattern**: [Selected Pattern: Sidecar / Event Bridge / Adapter / Full Merge]
- **Proof**: [Link to Test Plan or PoC Results]
- **Reversibility**: [Explicit statement on how to unwind this change]

## Canary Plan

- Metrics to watch: [p95 latency, error rate, saturation]
- Ramp: 5% → 20% → 50% → 100% (hold 20% for 30–60m)
- Rollback trigger(s): [SLO burn > X, error rate > Y, anomaly Z]
- Rollback steps: `helm rollback <release> <rev>` + feature flag

## Test Evidence

- Provide details on tests performed and evidence of success

## CI Confirmation

- Confirm that the golden path CI workflow ran and all required checks passed

## Non-Goals

- Outline what this pull request does not address or intentionally leaves out

## Hard Guarantees

- Specify any hard guarantees this change delivers and what remains simulated off

## Migration Gate (if applicable)

- [ ] Schema/contract change
- Gate: apply behind flag; run forward/backward compat tests

## Observability

- [ ] New traces/metrics/logs added
- Dashboards/alerts link:

## Security/Compliance

- [ ] Secrets via sealed-secrets
- [ ] SBOM attached; SAST/SCA clean
- [ ] Supply chain checks passed (signing, provenance, SBOM)
- Exception ID/reference (if applicable):

## Verification

- [ ] Smoke checks
- [ ] Golden path e2e: ingest → resolve → runbook → report

## 🧠 Copilot Review Tasks

- [ ] `/explain-changes`
- [ ] `/generate-tests`
- [ ] `/risk-callouts`
- [ ] `/summarize-diff`

## ✅ Checklist

- [ ] Code compiles & passes CI
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] OPA policies verified
- [ ] Grafana dashboards updated if applicable
- [ ] **Hot Files**: I have avoided modifying shared hot files (root config, Makefiles) unless absolutely necessary.
- [ ] **Feature Flags**: New behavior is hidden behind a feature flag.

## Test Evidence

- [ ] Provide links or attachments for test results.

## CI Confirmation

- [ ] Confirm that the golden-path CI workflow has run and passed successfully.

## Non-Goals

- Describe what this change does not cover.

## Hard Guarantees

- List the guarantees this change provides (e.g., performance thresholds, invariants).
