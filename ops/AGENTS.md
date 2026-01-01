# Ops Guidelines

## Scope & Precedence

This file applies to `ops/`.
If any instruction conflicts, follow this order:

1. `docs/governance/CONSTITUTION.md` and `docs/governance/META_GOVERNANCE.md`
2. `docs/governance/AGENT_MANDATES.md` and GA guardrails in `docs/ga/`
3. `AGENTS.md` at repo root
4. This file and local README instructions

- All YAML and config files use 2-space indentation.
- Shell scripts must start with `#!/usr/bin/env bash` and `set -euo pipefail`.
- Run `pre-commit run --files <files>` for touched files before committing.
