# Influence Ops Attribution Policy

## Policy Statement

Attribution in Influence Ops Suite is probabilistic and human-gated. No export of actor-level
claims is permitted without explicit HITL approval and audit stamps.

## Confidence Model

- Scores are calibrated and recorded as `confidence` with a `confidence_method`.
- Calibration metrics (ECE/Brier) are tracked per tenant and model version.
- Outputs must include uncertainty bounds and supporting evidence references.

## HITL Gate Requirements

1. Reviewer identity and approval timestamp.
2. Evidence bundle ID (`EVID-IOPS-*`).
3. Decision rationale and link to source evidence.
4. Revocation path (withdrawal or downgrade).

## Export Rules

- Actor-level exports require HITL approval and audit stamps.
- Narrative-level exports may proceed with standard audit stamps.
- Cross-tenant exports are prohibited without signed sharing policy.

## Audit Events

- `attribution.proposed`
- `attribution.reviewed`
- `attribution.approved`
- `attribution.revoked`

## Governance Alignment

All policy logic is enforced as policy-as-code in Maestro and recorded in the provenance ledger.
