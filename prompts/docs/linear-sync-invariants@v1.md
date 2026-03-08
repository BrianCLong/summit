# Prompt: Document Linear ↔ GitHub sync invariants for governance tickets

## Objective

Document the current Linear ↔ GitHub synchronization invariants for governance tickets so that
future workflow updates (deduping, canonicalization, labeling) do not break the mapping.

## Required outputs

- A short governance-facing document under `docs/ci/` that captures:
  - One-to-one pairing rules and immutable sync anchors.
  - A safe dedupe/canonicalization flow with an end-to-end example.
  - Label parity and closure requirements.
  - Risk/rollback notes and observability guidance.
- Update `docs/roadmap/STATUS.json` to record the documentation change.
- Link the new document from the CI docs index.

## Constraints

- Do not modify sync tooling or automation.
- Keep scope documentation-only.
- Use concise, present-tense language and cite authoritative governance files.

## Verification

- Confirm the new document is discoverable from `docs/ci/README.md`.
- Ensure status metadata is updated.
