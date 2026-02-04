# Repository Assumptions & Verified Paths

## Verified Paths
- **Documentation**: `docs/competitive/`, `docs/standards/`, `docs/security/data-handling/`, `docs/ops/runbooks/`
- **Scripts**: `scripts/bench/`, `scripts/monitoring/`
- **Source Code**: `summit/` (Python package), `summit/integrations/` (Adapters), `summit/evidence/` (Evidence writers)
- **Tests**: `tests/`, `tests/fixtures/`

## Core Assumptions
- **Python Environment**: The `summit` package is the core Python codebase.
- **Evidence System**: `summit.evidence` manages deterministic artifacts.
- **CI/CD**: GitHub Actions workflows in `.github/workflows/` enforce quality gates.
- **Test Runner**: `pytest` is used for Python tests.

## Conventions
- **Evidence IDs**: `EVID:<tool-slug>:<yyyymmdd>:<git-sha>:<scenario>`
- **Schemas**: JSON Schemas stored in `schemas/` or `schemas/<submodule>/`.
- **Policy**: "Deny-by-default" and "Never-log" are strictly enforced.
