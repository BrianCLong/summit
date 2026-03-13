# PR Hygiene Standards

## Reviewer Checklist
- [ ] Code is deterministic and tested (no non-deterministic mocks).
- [ ] `pnpm-lock.yaml` is clean and untainted.
- [ ] Pre-commit hooks and linters pass (`ruff check`, `eslint`).
- [ ] Size is manageable (<400 LoC where possible).

## Commit Rules
- Use Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`).
- Keep commit history clean (rebase/squash before merge).

## Merge Policy
- CI checks must pass.
- No direct pushes to `main`.
- Must satisfy coverage requirements.
