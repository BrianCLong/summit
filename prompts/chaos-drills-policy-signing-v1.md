# Chaos drills, fail-closed policy/signing, provenance receipts

## Objective

Deliver chaos drill scenarios for signer outage, OPA outage, and storage throttling; enforce fail-closed behavior for privileged operations when policy or signing is unavailable; capture receipts and recovery evidence in provenance; document drill outcomes and RPO/RTO results.

## Scope

- drills/
- server/src/services/
- server/src/provenance/
- docs/
- docs/roadmap/STATUS.json
- agents/examples/

## Constraints

- Use existing governance and provenance patterns.
- Fail-closed for privileged operations when OPA or signing is unavailable.
- Capture receipts and recovery evidence in provenance ledger entries.
- Document drill results with RPO/RTO outcomes.

## Verification

- Run scripts/check-boundaries.cjs
