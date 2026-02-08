# Dual-Use Policy — Defensive-Only Enforcement

## Scope
This policy applies to all influence-operations, narrative, cognitive state, proof-object, and wargame capabilities.

## Absolute Prohibitions
1. **No adversarial optimization**: the system must never generate or optimize offensive influence campaigns.
2. **No individual cognitive scoring**: only governed segments are allowed; individual-level inference is prohibited.
3. **No attribution claims without calibrated confidence**: all attributions require explicit confidence bounds and governance approval.
4. **No unbounded simulation**: all simulations must be deterministic, bounded, and replayable.

## Required Controls
- **Defensive-only defaults**: all features must default to defensive mitigation workflows.
- **Policy gates**: CI must fail if prohibited endpoints or features are introduced.
- **Audit & provenance**: all outputs must carry evidence IDs and provenance links.

## Enforcement Hooks
- CI gate: `dual_use_policy_gate`
- Segment policy gate: `segment_policy_gate`

## Evidence
All enforcement actions must emit deterministic artifacts (`report.json`, `metrics.json`, `stamp.json`) with Evidence IDs.
