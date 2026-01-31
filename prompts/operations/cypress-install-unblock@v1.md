# Summit — Cypress Install Unblock (v1)

**Objective:** Prevent Cypress postinstall failures caused by chalk incompatibility so dependency installation can complete for smoke/soak runs.

## Scope
- `package.json`
- `pnpm-lock.yaml`
- `docs/roadmap/STATUS.json`
- `prompts/operations/cypress-install-unblock@v1.md`
- `prompts/registry.yaml`

## Constraints
- Keep changes minimal and scoped to dependency resolution.
- Prefer targeted overrides over broad dependency changes.
- Do not modify runtime/server behavior.

## Acceptance Criteria
- `pnpm install` completes without Cypress postinstall errors.
- Changes are documented in roadmap status.
