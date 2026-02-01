# Summit Policy Baseline

## Readiness Assertion

Summit readiness and policy authority are defined in `docs/SUMMIT_READINESS_ASSERTION.md`.

## Deny-by-Default Contract

Summit policy execution is deny-by-default. Any tool or integration action must satisfy:

1. Explicit allowlist entry for the agent or integration.
2. Required security classification on the envelope.
3. Policy rules evaluated without bypass.

## Integration Guardrails

- Integrations are registered with explicit `never_log_fields`.
- Unregistered integrations are treated as denied.
- Only allowlisted integrations are permitted for execution.

## Evidence Discipline

- Evidence artifacts are deterministic and recorded under `evidence/`.
- Timestamps are confined to `stamp.json`.
- Evidence IDs are registered in `evidence/index.json`.

## Rollback

- Revert policy changes to restore the previous baseline.
- Feature flags remain disabled unless explicitly approved.
