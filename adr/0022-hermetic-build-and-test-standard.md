# 0022 — Hermetic Build & Test Standard for Summit Monorepo

## Status

Accepted

## Context

- The monorepo spans JS/TS (client), Python (backend & Airflow), Rust (workspace crates), and curated Go utilities.
- CI runtimes were drifting upward due to duplicated setup steps and inconsistent caching.
- Coverage expectations were uneven across languages, making it difficult to gate merges consistently.

## Decision

- Establish `make bootstrap && make test` as the canonical, hermetic entrypoint for local and CI validation.
- Dispatch language-specific runners:
  - JS/TS via Jest with coverage thresholds ≥80% (lines/branches) and JUnit + LCOV artifacts.
  - Python via Pytest + `pytest-cov` with fail-under 80% for backend and Airflow, emitting Cobertura XML.
  - Rust via `cargo llvm-cov` with fail-under 70% lines across the workspace.
  - Go via `go test` with atomic coverage and fail-under 70% for curated modules (starting with `sdk/go/abac`).
- Store deterministic outputs at known paths for artifact collection (`client/coverage`, `backend/coverage.xml`, `airflow/coverage.xml`, `target/lcov.info`, `sdk/go/abac/coverage.txt`).
- Add CI caching keyed by package + lockfile checksum (pnpm store, pip cache, Cargo registry, Go module cache) and upload coverage/test reports as artifacts.

## Consequences

- Contributors and CI share the same entrypoints, reducing drift between environments and lowering setup time.
- Coverage gates block regressions uniformly across languages; failing tests or insufficient coverage prevent merges.
- Cached dependency installs and deterministic artifact paths shorten CI wall-clock time and simplify debugging.
- Future packages can join the standard by adding targeted bootstrap/test scripts and coverage thresholds without changing the top-level contract.
