# Summit Python Agent Guidelines

This document adapts Summit's AI guidance for Python-specific work. Use it when
creating or editing Python code, configuration, or tests within this repository.

## Optimization Mindset

- Aim for **fully optimized** changes: correct, minimal, and measurable without
  inflating runtime or dependency footprint. Prefer targeted fixes over broad
  refactors.
- Keep dependency additions rare; prefer stdlib or existing libraries first.
  If a new dependency is required, justify it and update the relevant
  `pyproject.toml` only where the package lives.

## Tooling Preferences

- Prefer fast, modern tooling when available:
  - Dependency management: `uv` or `pip` according to the package's existing
    setup; do not replace established workflows.
  - Linting: `ruff` with an 88-character line limit. Respect package-level
    configs if they exist.
  - Types: `mypy` (or `pyright` where already in use). Use strict options that
    fit the package without breaking builds.
  - Testing: `pytest` with clear, focused tests. Keep fixtures small and
    deterministic.
- Use `orjson` for JSON-heavy paths and `polars` for dataframe workloads when
  those libraries are already present or clearly justified. Do not add them as
  runtime dependencies unless the target package already uses them.

## Coding Standards

- Follow PEP 8 formatting with an 88-character line length. Avoid wildcard
  imports and unused variables; prefer explicit, readable imports.
- Add type hints to function signatures, public methods, and module-level
  interfaces. Use `typing` and `collections.abc` primitives where practical.
- Write concise docstrings for modules, classes, and functions that describe
  behavior, inputs, outputs, and noteworthy side effects.
- Handle resources with context managers; avoid manual open/close pairs when a
  context manager exists.
- Avoid bare `except`. Catch specific exceptions and re-raise or log with
  actionable context. Keep error messages informative without leaking secrets.
- Remove debug prints and ad-hoc logging before committing. Prefer structured
  logging patterns already used in the target package.

## Testing Expectations

- Add or update `pytest` tests alongside the affected package (typically under
  `tests/` or `*/test_*` modules). Mirror existing naming conventions and
  fixtures.
- Keep tests deterministic and fast; avoid network, file system, or cloud
  dependencies unless explicitly mocked or provided via fixtures.
- When fixing bugs, include regression tests that would have failed before the
  change.

## Security and Secrets

- Never commit credentials, API keys, tokens, or live dataset paths. Keep secrets
  in `.env` files (ensuring `.gitignore` covers them) or the appropriate secret
  manager for the environment.
- Align Python changes with the readiness and governance sources referenced in
  `AGENTS.md`; cite those files when documenting compliance-sensitive behavior.
- Validate input and output boundaries; prefer explicit allow/deny lists over
  implicit behavior.
- Avoid deserializing untrusted data without validation.

## Local Execution

- Use the package's existing `Makefile`, `pyproject.toml`, or README instructions
  to install and run checks. Do not introduce new top-level workflows when
  package-scoped commands exist.
- Typical flow when supported: install via `uv sync` or `pip install -e .[dev]`,
  then run `ruff`, `mypy`, and `pytest` in that package.

## Commit Discipline

- Keep commits scoped to related changes with clear messages (Conventional
  Commit style preferred). Document notable trade-offs in the PR description.
- Note any skipped checks in the PR and why; default expectation is that lint,
  type checks, and tests pass for touched packages.
