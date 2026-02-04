# Prompt: Structured Content Primitives (Brief/Claim/Block)

## Goal

Define a unified, policy-aware content model for Summit by authoring JSON Schemas for Brief, Claim, and Block primitives and documenting their usage with a governance drift example.

## Scope

- Create schemas under `schemas/content/` for `brief`, `claim`, and `block`.
- Document the model under `docs/content/structured-content-model.md`.
- Update `docs/roadmap/STATUS.json` to reflect the change.

## Requirements

- Enforce evidence-first claims and policy tags across all primitives.
- Include work-item references for drift detection and governance linkage.
- Provide an encoded example brief plus referenced blocks.
- Align with Summit Readiness Assertion and governance authority files.

## Verification

- Ensure schemas validate required fields and forbid unexpected properties.
- Verify documentation references the schemas and authority files.

## Constraints

- Keep changes within the declared scope.
- Use consistent, explicit field names as described in the user request.
