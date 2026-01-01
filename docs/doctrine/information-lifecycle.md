DOCTRINE_LOCKED = true

# Information Lifecycle

Defines how information is admitted, maintained, and retired to preserve epistemic integrity.

## Stages

1. **Intake**: Facts arrive with attribution, source reliability, timestamps, and optional expiry.
2. **Admissibility Gate**: `InformationGate.admit` enforces expiry checks, revocation status, and attribution presence before use.
3. **Binding**: Admitted facts are bound to decisions with evidence IDs and confidence annotations.
4. **Monitoring**: Facts are re-evaluated when expiry changes, revocations occur, or source volatility increases.
5. **Retirement**: Expired or revoked facts are quarantined and tagged for provenance review.

## Controls

- Expiry and revocation are hard blockers for downstream decision flows.
- Admissibility decisions are logged with reasons for acceptance or refusal.
- Confidence cannot increase when information quality degrades; decisions must be slowed or quarantined.

## Evidence Expectations

- Every fact used in a decision carries a stable evidence identifier.
- Chain of custody (source → gate decision → decision binding) must be reproducible.
