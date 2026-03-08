# Runbook: Information Integrity Incident

## Trigger Conditions

- provenance-check failure
- tamper-check failure
- trust score collapse in critical claims

## Immediate Actions

1. Validate `artifacts/evidence-chain.json` hash continuity.
2. Recompute evidence hashes and compare with recorded chain.
3. Quarantine affected claims from decision surfaces.
4. Notify governance and security owners with evidence bundle.
5. Recover from known-good chain checkpoint.

## Recovery Exit Criteria

- provenance verification passes
- tamper check passes
- impacted claims re-validated and re-published
