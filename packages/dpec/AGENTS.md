## Scope & Precedence

This file applies to `packages/dpec/`.
If any instruction conflicts, follow this order:

1. `docs/governance/CONSTITUTION.md` and `docs/governance/META_GOVERNANCE.md`
2. `docs/governance/AGENT_MANDATES.md` and GA guardrails in `docs/ga/`
3. `AGENTS.md` at repo root
4. This file and local README instructions

- Follow repository default TypeScript style (2 spaces, eslint/prettier conventions).
- Keep adapters free of direct runtime dependencies on vendor SDKs; type-only shims are acceptable.
