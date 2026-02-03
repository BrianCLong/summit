# Repo Assumptions (SDD bootstrap)

## Verified (from repository root listing)

- `.claude/`
- `.agentic-prompts/`
- `.agent-guidance/`
- `.husky/`
- `.githooks/`
- `.github/`

## Assumed (must validate in-repo)

- `.claude/` contains agent configuration and may already use tasks or memory files.
- `.husky/` or `.githooks/` are active for local backpressure.
- Standard docs taxonomy exists under `docs/` for security/ops/standards.

## Must-not-touch (until confirmed)

- `GOLDEN/`
- `THIRD_PARTY_NOTICES/`
- `SECURITY/`
- `.pnpm-store/`
- `.venv_*`
- Large generated directories (treat as immutable unless an issue explicitly targets them).

## Validation checklist (before PR2+)

- Locate existing agent workflow docs: search for “agentic”, “prompts”, “CLAUDE”, “tasks”.
- Confirm whether `.husky/pre-commit` exists and how hooks are run in CI.
- Confirm test runner + lint/typecheck commands used by Summit.
- Identify current CI required checks (see `docs/CI_STANDARDS.md`).
