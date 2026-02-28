# Repo Assumptions Validation

## Verified
- **Policies directory exists:** `/policies` is present.
- **Scripts directory exists:** `/scripts` is present and contains CI checks.
- **Docs directory exists:** `/docs` is present.
- **GitHub workflows exist:** `/.github/workflows/` is present.
- **Evidence mechanisms:** Evidence is managed via `stamp.json` files and artifacts are meant to be deterministic.

## Assumed
- **Go Project Structure (`/cmd`, `/internal`, `/pkg`):** **INCORRECT.** The repository is not a single Go module. It is a polyglot monorepo containing multiple independent services and libraries across Go, Python, and Node.js. Root-level directories like `/lho`, `/pcbo`, and `/pbs` are individual Go modules, each with their own `cmd` and `internal` directories. There is no root-level `/internal` or `/pkg` directory.
- **New Module Placement:** Putting the new module at `/internal/frameworkrisk/` will not work because `/internal` doesn't exist. It should likely be created as a new root-level module (e.g., `/frameworkrisk/`) or integrated into an existing relevant module if one exists.
- **Evidence Format:** Evidence artifacts (like `report.json`, `metrics.json`) should be stored in a dedicated `evidence` folder (e.g. `artifacts/frameworkrisk/` or `evidence/aeip/`) and must avoid dynamic timestamps.

## Must-not-touch files
- **`evidence/stamp.json`**: Do not use dynamic timestamps for evidence artifacts to prevent CI determinism failures (`evidence-verify`).
- **Existing Policies**: Do not broadly modify existing policies unless necessary for the new risk gate.
- **Root `cmd/summit`**: Does not exist as assumed. The primary entry points are distributed across the respective module directories (e.g. `summit/main.py` for the python summit agent, or `lho/cmd/lho/main.go`).
