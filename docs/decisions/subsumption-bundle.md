# Decisions — subsumption-bundle

## DEC-001 — Establish Subsumption Bundle Contract

- **Decision:** Add a deterministic bundle contract with evidence triad, fixtures, and docs targets.
- **Why:** The Summit Readiness Assertion (`docs/SUMMIT_READINESS_ASSERTION.md`) mandates evidence-first, deny-by-default governance.
- **Alternatives rejected:** Ad hoc evidence without bundle manifests (rejected: weak auditability).
- **Deferred pending:** ITEM-specific integration until source excerpts and licensing are provided.
- **Rollback:** Remove the bundle folder and evidence index entries to revert.

## DEC-002 — Evidence Index as the Authority

- **Decision:** Evidence IDs must be recorded in `evidence/index.json` before merge.
- **Why:** Enforces traceability and prevents orphaned evidence artifacts.
- **Impact:** Aligns CI verification with governance requirements.

## MAESTRO Threat Modeling Summary

- **MAESTRO Layers:** Foundation, Data, Agents, Tools, Observability, Security.
- **Threats Considered:** Evidence tampering, manifest drift, prompt-injection contamination, tool misuse.
- **Mitigations:** Deterministic evidence schema, deny-by-default fixtures, evidence index enforcement, restricted bundle scope.
