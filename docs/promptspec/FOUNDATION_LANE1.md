# PromptSpec Foundation Lane 1

## Summit Readiness Assertion
This guidance operates under the Summit Readiness Assertion and the Constitution of the Ecosystem.

## Purpose
Define the minimal, governed workflow for adding PromptSpec artifacts, registering prompts, and
verifying prompt integrity in CI.

## Files of Record
- `schemas/promptspec.schema.json`
- `promptspec/promptspec.schema.json`
- `prompts/registry.yaml`
- `prompts/promptspec/promptspec-foundation-lane1@v1.md`
- `scripts/ci/verify-prompt-integrity.ts`

## Minimal PromptSpec Example
A schema-valid starter example is located at:
- `promptspec/specs/minimal_example_v0.json`

## Workflow
1. Create or update a PromptSpec JSON file under `promptspec/specs/` that conforms to
   `schemas/promptspec.schema.json`.
2. Register the prompt in `prompts/registry.yaml` and include the SHA-256 hash of the prompt file.
3. Run `node scripts/ci/verify-prompt-integrity.ts` to enforce hash and scope consistency.

## Hashing Notes
- The registry hash is authoritative; any mismatch blocks CI.
- Hash the exact prompt file bytes (no normalization) before updating `prompts/registry.yaml`.

## Guardrails
- All PromptSpecs must declare `policies.tools_allowed` and `policies.deny_guaranteed_earnings`.
- Prompt templates are treated as immutable once registered; updates require new versions.
- Evidence artifacts must remain deterministic and reference the PromptSpec ID.
