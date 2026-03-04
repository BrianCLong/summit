# Repo Assumptions

## Verified Paths
- `summit/`: Python summit namespace code.
- `src/summit/`: Alternate python path.
- `docs/`: Exists
- `tests/`: Exists

## Assumed Paths
- `cmd/summit/`: Created, previously assumed.
- `internal/`: Created, previously assumed.
- `pkg/`: Created, previously assumed.
- `scripts/`: Exists.
- `.github/workflows/`: Exists.

## Must-not-touch list
- `cmd/summit/main.*` (N/A yet)
- `internal/core/**` (N/A yet)
- existing evidence schemas (e.g., `summit/evidence/schemas/`)

## CI Gates & Required Checks
Assumed: Go or Python testing framework exists. Given instructions used `pkg/` and `internal/`, we will write the core Supermux logic in Go, matching the instructions provided.
