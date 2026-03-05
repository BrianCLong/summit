# Auditor Verify

## Objective
Auditor Verify is the flagship verification workflow for the Governed OS. It validates that a
report is backed by deterministic evidence, policy-compliant approvals, and fully resolved
citations within an SLO-bound window.

## Workflow

1. **Select report**: auditor or analyst selects the report for verification.
2. **Load evidence bundle**: the system loads `report.json`, `metrics.json`, and `stamp.json`.
3. **Verify policy**: policy explainability tree is loaded and validated.
4. **Resolve citations**: citations are resolved to evidence hashes.
5. **Replay validation**: deterministic replay verifies hash-identical `metrics.json`.
6. **Decision**: verification status is returned and stamped.

## SLO Targets

- **Auditor verify latency**: < 20 seconds (reference environment).
- **Citation resolution rate**: 100% for exported artifacts.

## Offline/Residency Requirements

- Auditor Verify runs in offline and air-gapped environments.
- Evidence resolution never crosses region boundaries.
- Evidence bundles are deterministic and replayable per tenant.

## Evidence Artifacts

Every verification produces:

- `report.json`
- `metrics.json`
- `stamp.json`

## Policy Explainability

Every verification includes a policy explainability artifact that enumerates:

- Policy path (rule → scope → approval)
- Execution identity and capability scope
- Evidence hashes bound to the report

## Status

Auditor Verify scope is bound to the Governed OS epic and aligned to the Summit Readiness
Assertion. Any deviation is deferred pending governance review.
