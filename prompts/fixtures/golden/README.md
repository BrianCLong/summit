# Golden Fixtures

These fixtures define the canonical, cross-tool contract examples for agent validation. They are used to keep Claude, Gemini, Cursor, and Codex behavior aligned with GA governance gates.

## Fixtures

- `pr-metadata.sample.md`: Canonical PR metadata block used by `scripts/ci/validate-pr-metadata.ts`.
- `prompt-integrity.sample.json`: Canonical prompt integrity parameters used by `scripts/ci/verify-prompt-integrity.ts`.
- `agent-contract.sample.json`: Canonical agent contract surface example.

## Usage

1. Keep fixtures in sync with `/Users/brianlong/Developer/summit/.github/PULL_REQUEST_TEMPLATE.md` and `/Users/brianlong/Developer/summit/prompts/registry.yaml`.
2. Update fixtures when agent contract surfaces or guardrails change.
3. Reference `docs/ga/GATE_FAILURE_CATALOG.md` for deterministic remediation paths.
