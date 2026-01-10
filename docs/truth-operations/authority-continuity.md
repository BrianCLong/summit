# Authority Validation Under Pressure

**Authority must be continuous to be trusted.** Summit separates identity, authority, and content to detect impersonation, forged legitimacy, and compromised channels.

## Authority Continuity Ledger

- Records source identities, signing keys, chain-of-custody events, and trust decisions.
- Maintains **continuity score** that decays when anomalies appear (key rotation without notice, geography shifts, behavioral drift).
- Supports emergency overrides with explicit duration, approver identity, and rollback plan.

## Validation Controls

- **Cryptographic Verification**: enforce signed assertions and certificate pinning for high-impact sources.
- **Behavioral Fingerprints**: track publication cadence, linguistic markers, network paths; deviations trigger scrutiny.
- **Role Separation**: identity proof != content trust; authority elevation requires both provenance and integrity thresholds.
- **Continuity Thresholds**: hard requirements for critical actions (e.g., >80 continuity, >70 integrity) before automation executes.

## Pressure Scenarios

- **Impersonation Burst**: multiple sources adopt a trusted identity; ledger flags discontinuity and downgrades authority.
- **Key Compromise**: signing chain mismatch or revoked key; all dependent narratives drop to low integrity and enter containment.
- **Sudden Elevation**: unvetted sources attempting to drive decisions; authority gating blocks until vetted and cross-corroborated.

## Metrics

- Continuity score drift per source
- Number of authority elevation attempts blocked vs approved
- MTTR for authority restoration after compromise
- Override frequency and expiry compliance

## Governance

- All authority decisions are auditable and versioned in the ledger.
- Policy-as-code in `policies/truth-defense.rego` enforces elevation rules, override lifetimes, and continuity thresholds.
