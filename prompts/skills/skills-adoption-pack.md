# Summit Skills Adoption Pack Prompt (v1)

## Goal

Implement a secure Summit Skills system that imports third-party SKILL.md skills,
hardens them with OPA policy, and executes them with reproducible evidence.

## Scope

- Add `skills/` registry structure (external, overlays, registry metadata).
- Implement `pnpm skill` CLI with add, vet, run, list.
- Add `policy/skills/` with default-deny OPA policy and overlay permissions.
- Integrate skill vet into PR and release workflows.
- Document usage in `docs/skills.md`.
- Update `docs/roadmap/STATUS.json`.

## Constraints

- Default deny for network, shell, filesystem writes, credentials.
- Evidence bundles must be emitted for add/vet/run.
- No direct commits to main.
- Keep dependencies minimal and reuse existing tooling.
