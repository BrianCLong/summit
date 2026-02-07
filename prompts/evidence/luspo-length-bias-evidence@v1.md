# Prompt: LUSPO Length-Bias Evidence Scaffold (v1)

## Objective

Scaffold deterministic RLVR length-bias evidence artifacts for LUSPO-2602-05261, update GA verification documentation, and record roadmap status while preserving deny-by-default and privacy guardrails.

## Required Outputs

- Evidence pack files under `evidence/LUSPO-2602-05261/` and index entry updates.
- GA documentation entry in `docs/ga/` that references the evidence pack and readiness alignment.
- Verification map and GA matrix updates aligned to `make ga-verify`.
- Required checks discovery notes updated.
- Roadmap status update.
- Minimal `.gitignore` exception to allow required evidence README tracking.

## Constraints

- Deterministic outputs; timestamps only in `stamp.json`.
- No secrets or raw prompts in evidence.
- Keep blast radius minimal and avoid global tooling changes.

## Validation

- `node scripts/check-boundaries.cjs`
- `make ga-verify`
