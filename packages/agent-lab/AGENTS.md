# Agent Lab Package Instructions

## Scope & Precedence

This file applies to `packages/agent-lab/`.
If any instruction conflicts, follow this order:

1. `docs/governance/CONSTITUTION.md` and `docs/governance/META_GOVERNANCE.md`
2. `docs/governance/AGENT_MANDATES.md` and GA guardrails in `docs/ga/`
3. `AGENTS.md` at repo root
4. This file and local README instructions

- Use 2 spaces for TypeScript and JSON files.
- Keep this package self-contained; do not import from server/ or client/ directly.
- Provide unit tests for any new functionality in `__tests__/` with Jest.
- Do not commit built artifacts; rely on source in `src/`.
