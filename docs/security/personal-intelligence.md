# Personal Intelligence Layer (PIL) Security Notes

## Readiness Anchor
This security posture is aligned with the Summit Readiness Assertion in `docs/SUMMIT_READINESS_ASSERTION.md`.

## MAESTRO Threat Modeling
- **MAESTRO Layers**: Foundation, Data, Agents, Tools, Observability, Security.
- **Threats Considered**:
  - T1: Cross-project profile bleed.
  - T2: Sensitive data captured into profiles.
  - T3: Prompt injection via profile prompt field.
  - T4: Unauthorized profile reads/updates.
- **Mitigations**:
  - Explicit scope resolution and isolation for every read/write.
  - Sensitive fields never logged; redact at middleware boundaries.
  - Deterministic rendering with strict templating and truncation limits.
  - AuthZ enforcement with audited CRUD events.

## Data Handling
- **Classification**: `customPrompt` and derived preferences are sensitive.
- **Retention**: defaults to 30 days unless overridden by policy.
- **Export/Delete**: support audit export and hard-delete per scope.

## Determinism Constraints
- Deterministic capsule rendering: stable ordering, fixed templates, and explicit truncation.
- No timestamps in evidence artifacts except `stamp.json`.
