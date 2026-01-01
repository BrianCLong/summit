# RQB Toolkit Guidelines

## Scope & Precedence

This file applies to `tools/rqb/`.
If any instruction conflicts, follow this order:

1. `docs/governance/CONSTITUTION.md` and `docs/governance/META_GOVERNANCE.md`
2. `docs/governance/AGENT_MANDATES.md` and GA guardrails in `docs/ga/`
3. `AGENTS.md` at repo root
4. This file and local README instructions

- Python modules must use 4 spaces for indentation.
- Prefer type hints for public interfaces.
- Keep dataset fixtures small and deterministic.
