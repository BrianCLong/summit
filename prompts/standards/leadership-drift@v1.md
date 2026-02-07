# Prompt: Leadership Drift Standard Pack (v1)

## Mission

Publish the Leadership Drift standard, data-handling policy, and operational runbook, update
repo assumptions, and record roadmap status. Enforce deterministic language and deny-by-default
safeguards for high-risk automation.

## Scope

- Create documentation:
  - `docs/standards/leadership-drift.md`
  - `docs/security/data-handling/leadership-drift.md`
  - `docs/ops/runbooks/leadership-drift.md`
- Update `repo_assumptions.md` with verified items, deferred validation, and commands.
- Update `docs/roadmap/STATUS.json` with a new initiative entry.
- Register this prompt in `prompts/registry.yaml`.
- Add task spec under `agents/examples/` per `agents/task-spec.schema.json`.

## Constraints

- Deterministic outputs; no timestamps in artifacts.
- No policy bypasses or weakening of governance controls.
- Keep changes within documentation and governance metadata only.

## Verification

- Run `scripts/check-boundaries.cjs`.
- Confirm files are written and referenced in registry and task spec.
