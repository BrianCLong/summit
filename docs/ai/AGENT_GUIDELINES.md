# Summit AI Agent Guidelines

These guidelines translate Summit's expectations for AI-assisted changes into
practical steps. They complement the repository-wide governance files and should
be followed for any language or stack.

## Purpose and Scope

- Use these rules whenever proposing code or documentation changes.
- When a directory contains its own `AGENTS.md`, follow that file in addition to
  this one. More specific instructions take precedence.
- Keep changes small, reviewable, and aligned with the existing project layout.

## Core Principles

- **No secrets in code**: never commit credentials, tokens, or sensitive data.
  Use `.env` files or existing secret management patterns and ensure `.gitignore`
  continues to block secrets.
- **Governance first**: treat `docs/SUMMIT_READINESS_ASSERTION.md` as the
  readiness baseline and align definitions with the governance sources listed in
  the root `AGENTS.md`. Cite the authoritative files in summaries instead of
  opinions.
- **No surprises**: prefer the smallest viable change that keeps CI green.
  Avoid refactors unless they are necessary for the task.
- **Meaningful, consistent code**: favor descriptive names, avoid wildcard
  imports, and remove debug prints or ad-hoc logging before committing.
- **Defensive error handling**: avoid bare `except` or catch-all handlers; prefer
  explicit exceptions, context managers, and clean resource handling.
- **Documentation and types**: add docstrings and type hints where the language
  supports them, especially for public-facing functions, classes, and modules.

## Working in Summit

- **Project structure**: add new code next to similar functionality. Reuse
  existing module boundaries (e.g., keep service-specific logic under the
  matching service/package directory and tests alongside their targets).
- **Tests**: mirror existing patterns. For JS/TS, add tests near the module or
  in the `tests`/`__tests__` directories already present. For Python packages,
  use `pytest`-style tests in the package's test folder. For Go/Rust, follow the
  language defaults in the same module.
- **Local commands**: prefer the repository's standard entry points:
  - `make bootstrap && make up && make smoke` for full setup where applicable.
  - `pnpm install` then `pnpm run lint`, `pnpm test`, and `pnpm run format` for
    Node/TypeScript workflows.
  - Package-specific commands listed in local READMEs or `Makefile`s take
    priority; do not invent new workflows when established ones exist.

## Review and Change Management

- Write clear commit messages (Conventional Commit style preferred) and keep
  logical changes in separate commits when possible.
- When an exception is unavoidable, document it as a **Governed Exception** with
  a brief rationale and the governing source file.
- Ensure new documentation links are accurate and paths exist.
- Prefer additive changes over rewrites; if you must change behavior, explain it
  in commit messages and PR text.

## Security and Compliance

- Never introduce third-party code or binaries without review.
- Sanitize sample data and logs; remove PII or regulated content.
- Follow repository governance files referenced at the root-level `AGENTS.md`.

## Quality Checklist

- [ ] No secrets or tokens in code or docs.
- [ ] Names, imports, and logging cleaned up; no leftover debug statements.
- [ ] Docstrings and type hints added where appropriate.
- [ ] Tests added or updated near the affected components.
- [ ] Local checks run using the project's preferred commands; note any skipped
      checks and why.
