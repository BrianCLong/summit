# Policy Gateway

## Role

Centralizes policy evaluation for CIRW, FASC, PQLA, SATT, and QSDR service calls.

## Capabilities

- Evaluates policy effects: allow, deny, require-federation, quarantine, attest-first.
- Issues decision identifiers and records evaluated ruleset versions.
- Integrates with disclosure engine for export constraints.

## Example Checks

- CIRW cross-tenant clustering requires federation token.
- FASC quarantine thresholds and corroboration requirements.
- PQLA export tokens for analytics with export effect.
- SATT attestation + license budget before execution.
- QSDR query-shape allowlists and privacy budgets.
