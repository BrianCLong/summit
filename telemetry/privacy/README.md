# Telemetry Privacy Scaffold

This directory defines the deny-by-default telemetry policy surface for Summit. The
current policy aligns terminology with deterministic **pseudonymization** rather
than anonymization. Pseudonymized data remains personal data when attribution is
reasonably possible, so Summit treats these fields as controlled data that require
explicit transforms and domain-scoped linkability.

## Files

- `classification.schema.json`: canonical field policy schema.
- `allowlist.json`: field-level allowlist for the event envelope.
- `pii_taxonomy.json`: baseline sensitive-field taxonomy.

## Guardrail

`ci/check_telemetry_privacy.py` verifies that every top-level field in
`events/schema/event.schema.json` is explicitly declared in the allowlist and
that RESTRICTED_PII fields are never emitted without a drop/mask/pseudonymize
transform.

## Policy terms

- **Deterministic pseudonymization**: stable tokens within a domain, never treated
  as anonymous by default.
- **Linkability**: allowed correlation scope for a field (none, intra-domain,
  cross-domain). Cross-domain linkage requires explicit governance.
