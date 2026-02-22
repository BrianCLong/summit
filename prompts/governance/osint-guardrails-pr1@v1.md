# Prompt: OSINT Guardrails PR1

You are implementing the OSINT guardrails foundation (lane 1) in Summit. Deliverables:

- Source registry, risk envelopes, and retention configs under `config/osint/`.
- JSON schemas for OSINT source registry, risk envelopes, provenance receipt, collection event, and redaction report under `schemas/osint/`.
- Deny-by-default OPA policies and fixtures under `.github/policies/osint/` with unit tests.
- CI workflow to validate OPA policies and schema presence under `.github/workflows/`.
- Evidence bundle scaffolding and updates to `evidence/index.json`.
- Update `docs/roadmap/STATUS.json` with the OSINT limits envelope initiative.
- Add an agent task spec under `agents/examples/` for this change.

Constraints:

- Deny-by-default behavior is required.
- Include two negative fixtures and one positive fixture per policy.
- Ensure deterministic evidence outputs with timestamps only in `stamp.json`.
- Follow conventional commits and repository governance rules.
