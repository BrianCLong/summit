# Prompt: Non-Public Tool Harness Implementation

## Goal
Implement a deterministic policy-gated non-public access harness with HITL approval validation and artifact emission tests.

## Scope
- `src/hooks/nonpublic.ts`
- `src/hooks/__tests__/nonpublic-data-access.test.ts`
- `docs/roadmap/STATUS.json`
- `prompts/hooks/nonpublic-tool-harness@v1.md`
- `prompts/registry.yaml`
- `agents/examples/NONPUBLIC_TOOL_HARNESS_TASK.json`

## Requirements
- Deny-by-default policy evaluation for non-public sources.
- Strict matching on source, scope, purpose, retention, and approval state.
- Deterministic artifact writer for policy, audit, provenance, and approval files.
- HITL approval request/grant protocol with nonce and signature verification.
- Automated tests for deny/allow/artifact/HITL behaviors.

## Verification
- Run targeted Vitest suite for nonpublic harness.

## Constraints
- Keep logic isolated to hooks module and related tests.
