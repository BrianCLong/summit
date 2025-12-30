# Policy Effects

Unified view of policy decisions across the five wedges.

## Policy Decision Outcomes

- **Allow:** Operation may proceed; may still require disclosure enforcement.
- **Deny:** Operation is blocked with a policy decision identifier and rationale.
- **Require-Federation:** Operation allowed only with a valid federation or export token.
- **Quarantine:** Operation allowed in limited corroboration-only mode.
- **Attest-First:** Execution requires verified attestation of code or environment.

## Example Bindings

- **CIRW:** Policy prevents cross-tenant clustering without federation tokens; query confidence thresholds honored.
- **FASC:** Quarantine effect demotes feed weight and requires corroboration path.
- **PQLA:** Export effect rejected unless export authorization token present.
- **SATT:** Execution gated by attestation and license budget; disclosure constraints enforced by policy.
- **QSDR:** Policy defines allowed query shapes and privacy budgets; violations trigger kill and audit logging.

## Logging & Provenance

All policy evaluations generate signed decisions with decision ID, inputs, evaluated ruleset, and outcome effect. These decisions are referenced by witnesses, receipts, and audit records.
