# PSC Runner SDK Guidelines

## Scope & Precedence

This file applies to `sdk/psc-runner/`.
If any instruction conflicts, follow this order:

1. `docs/governance/CONSTITUTION.md` and `docs/governance/META_GOVERNANCE.md`
2. `docs/governance/AGENT_MANDATES.md` and GA guardrails in `docs/ga/`
3. `AGENTS.md` at repo root
4. This file and local README instructions

- TypeScript files must use 2-space indentation and follow ESLint defaults.
- Prefer functional utilities over classes unless stateful behavior is required.
- Keep SDK functions pure and wrap CLI execution errors with contextual messages.
