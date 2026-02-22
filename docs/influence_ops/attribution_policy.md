# Influence Ops Attribution Policy

## Principle

Attribution outputs are hypotheses with calibrated confidence, not assertions of fact.

## Policy Rules

1. Every attribution record must carry:
   - `confidence_score`
   - `calibration_bucket`
   - `requires_hitl`
   - provenance chain
2. Exports containing actor attribution are blocked unless HITL approval is recorded.
3. Rejected or revoked hypotheses remain in the ledger with full audit lineage.
4. UI language must present confidence labels and uncertainty warnings.

## Confidence Bands

- `LOW`: 0.00-0.39
- `MEDIUM`: 0.40-0.74
- `HIGH`: 0.75-1.00

## Export Gate

Export is permitted only when all conditions pass:

- `requires_hitl = true` and reviewer approval exists
- no unresolved privacy flags
- tenant policy allows attribution export
- evidence bundle present (`report.json`, `metrics.json`, `stamp.json`)

## Audit Events

Required events for every attribution lifecycle:

- `attribution_hypothesis_created`
- `attribution_hitl_requested`
- `attribution_hitl_approved` or `attribution_hitl_rejected`
- `attribution_export_blocked` or `attribution_export_permitted`
- `attribution_hypothesis_revoked` (when applicable)
