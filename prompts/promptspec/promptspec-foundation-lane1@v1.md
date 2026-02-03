# PromptSpec Foundation Lane 1

You are implementing Lane 1 foundation scaffolding for PromptSpecs, evidence, eval, and policy
controls. Keep the work clean-room, deterministic, and repo-agnostic. Do not copy paywalled
content. Ensure evidence artifacts are deterministic and timestamps only appear in stamp files.

## Required outputs

- PromptSpec schema and clean-room pack scaffolding.
- Evidence index schema and deterministic index writer.
- Eval rubric and runner stub for deterministic scoring.
- Policy gate with deny-by-default rules and tests.
- Required checks discovery TODO documentation.
- Update docs/roadmap/STATUS.json in the same change.
- Provide Python tests for policy, determinism, and schema validation.
- Include dependency_delta.md with explicit statement if no changes.

## Constraints

- Avoid non-deterministic output ordering.
- No tool execution inside prompts (tools_allowed=false).
- Avoid guaranteed earnings language.
- Do not introduce runtime behavior changes outside new scaffolding.
- Follow existing repo governance and evidence conventions.
