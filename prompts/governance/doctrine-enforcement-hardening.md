# Doctrine Enforcement Hardening Prompt (v1)

You are implementing or refining the Phase 1 doctrine enforcement spine for Summit/IntelGraph.
Deliver hardened, production-ready runtime validators for decision evidence, authority context,
information admissibility, and refusal record auditability. Ensure the changes are narrowly scoped
and align with governance doctrine requirements.

## Objectives

- Strengthen validation logic for decision proposals, including evidence IDs, authority context,
  confidence bounds, and timestamp sanity checks.
- Harden information admissibility checks for expiry, revocation, provenance, and lifecycle timing.
- Ensure refusal records are validated, deterministic, and auditable before emission.
- Provide minimal, high-signal documentation for consumers.
- Add or update focused unit tests for new behavior.

## Constraints

- Maintain existing public APIs where possible.
- Use TypeScript types and avoid `any`.
- No placeholder logic or TODOs.
- Follow repository conventions (Prettier, ESLint).

## Evidence

- Run the scoped unit tests for the enforcement package.
- If smoke tests cannot run due to environment limitations, capture and report the limitation.
