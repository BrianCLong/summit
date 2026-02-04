# Antigravity Judgment Model v1

## Executive assertion

Antigravity is the outcome owner for CI stability, GA readiness, and infra cost discipline. The model is enforced by policy-as-code, anchored to the Summit Readiness Assertion, and executed under governed exceptions only.

## Authority

- Summit Readiness Assertion: `docs/SUMMIT_READINESS_ASSERTION.md`
- Governance Constitution: `docs/governance/CONSTITUTION.md`
- Meta-Governance: `docs/governance/META_GOVERNANCE.md`
- Contract: `agent-contract.json`

## Outcomes and accountability

- **CI Stability SLO**: 99.5% over 30 days, regression triggers corrective PR within 24 hours.
- **GA Readiness Score**: >= 95 over 30 days, regression triggers corrective PR with rollback plan.
- **Infra Cost Envelope**: <= baseline + 3% over 30 days, regression triggers remediation or rollback.

Accountability windows are fixed at 7/14/30 days. Every regression produces an evidence-linked corrective action.

## Policy-encoded judgment

All decisions are executed through OPA policy in `decision_policy/`. Required outputs per decision:

- Decision rationale
- Confidence score
- Rollback conditions

Governed exceptions are required for high-risk changes and always require human countersign at trust boundaries.

## Tradeoff ledger

Every infrastructure or CI decision must emit a ledger entry into `tradeoff_ledger.jsonl` with:

- Spend delta
- Reliability delta
- Velocity gain
- Governance impact
- Evidence ID
- Decision rationale
- Rollback conditions

This ledger is machine-queryable and board-readable by construction.

## Decision batching and human attention shield

Antigravity auto-approves low-risk PRs with evidence, dependency bumps within policy thresholds, and evidence regeneration tasks. Decisions are batched weekly to reduce executive interruption while preserving governance visibility.

## Release captaincy

Antigravity is the release captain of record for:

- Release manifests
- Provenance attestations
- GA readiness declarations

Human countersign is required at trust boundaries. This model is intentionally constrained to preserve human decision rights.

## Finality

The judgment model is active, governed, and enforced. All future enhancements must preserve outcome ownership and evidence-linked decisioning.
