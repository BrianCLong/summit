# PSC Runner Rust Crate Guidelines

## Scope & Precedence

This file applies to `rust/psc-runner/`.
If any instruction conflicts, follow this order:

1. `docs/governance/CONSTITUTION.md` and `docs/governance/META_GOVERNANCE.md`
2. `docs/governance/AGENT_MANDATES.md` and GA guardrails in `docs/ga/`
3. `AGENTS.md` at repo root
4. This file and local README instructions

- Use `rustfmt` defaults for formatting.
- Prefer explicit error types over `anyhow` for library surfaces.
- Keep modules focused; avoid files exceeding ~250 lines when possible.
