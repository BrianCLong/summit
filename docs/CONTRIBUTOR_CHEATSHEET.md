# Contributor Cheat Sheet

## Essential Commands

- **Bootstrap:** `make bootstrap` (deps, venv, .env).
- **Quickstart:** `npm run quickstart -- --ai --kafka` (full stack) or `npm run quickstart -- --no-dev` for headless bring-up.
- **Smoke:** `make smoke` (mirrors CI golden path) and `pnpm graphql:schema:check` before PRs touching schema.
- **Docs:** `./scripts/generate-docs.sh` then ensure `git status` clean.
- **Clean up:** `make down` to stop compose; `docker system prune -af` for local reset.

## PR Labels & Automerge

- `automerge-safe`: enables merge-train once CI is green and no conflicts.
- `needs-backport`: triggers release managers to cherry-pick.
- `docs-only`: signals reviewers to skip heavy runtime validation.
- `breaking-change`: requires migration note and owner sign-off.

## Review Checklist (fast)

- Tests + lint + typecheck run locally or in CI.
- API contracts updated (OpenAPI/GraphQL) with regenerated artifacts.
- Feature flags documented in PR description and runbooks.
- Security scan considerations noted for new dependencies.

## Release & Branching

- Branch naming: `feat/<scope>`, `fix/<scope>`, `docs/<topic>`.
- Conventional commits required; squash merges handled by bot when `automerge-safe` applies.
- Required checks: `ci-lint-and-unit`, `ci-golden-path`, `security` (CodeQL/gitleaks).
