# Claude Code Repo Contract

## Purpose
This document serves as the source of truth for Claude Code's interaction with the Summit Monorepo. It defines the verified "Golden Path" for development and verification, preventing hallucinated commands and ensuring consistent operations.

## Golden Path (Verified)
These commands are the ONLY approved entry points for their respective lifecycle stages.

- **Bootstrap**: `make bootstrap`
  - *Source*: Makefile (calls `scripts/bootstrap.sh`)
  - *Effect*: Installs dependencies and validates environment.
- **Up**: `make up`
  - *Source*: Makefile
  - *Effect*: Starts the development stack (Docker Compose).
- **Smoke**: `make smoke`
  - *Source*: Makefile
  - *Effect*: Runs bootstrap, starts services, and executes health checks.
- **GA (Gate)**: `make ga`
  - *Source*: Makefile (calls `scripts/ga-gate.sh`)
  - *Effect*: Enforceable GA Gate (Lint, Deep Health, Smoke, Security).

## Repo Map
Confirmed top-level directories:
- `apps/`
- `client/`
- `devtools/`
- `packages/`
- `prov-ledger-service/`
- `sdk/`
- `server/`
- `services/`
- `tools/`

## PR Discipline
1. **Atomic PRs**: Each PR must address exactly one task/prompt. Do not mix unrelated changes.
2. **Verification Required**: All changes must be verified with the relevant Golden Path command.
3. **Evidence Template**: Every PR description must follow the structure in `.prbodies/claude-evidence.md`.

## When GA is Red
If `make ga` fails, triage using these verified commands:
1. `make logs` - View service logs.
2. `make test` - Run the test suite.
