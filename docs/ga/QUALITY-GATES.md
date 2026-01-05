# Quality Gates — Determinism & Reproduction

These gates are wired into `make ga` / `.github/workflows/ga-gate.yml` so local runs match CI. Both commands are dependency-free beyond the workspace toolchain and produce artifacts under `artifacts/ga/`.

## Coverage Gate

- **Command:** `pnpm coverage:gate`
- **Scope:** Runs coverage only for workspaces with JS/TS deltas since `COVERAGE_BASE_REF` (default `origin/main`).
- **Thresholds:**
  - `intelgraph-server`: lines/statements 80%, branches 70%, functions 75%
  - `client`: lines/statements 70%, branches 60%, functions 65%
- **Artifacts:** `artifacts/ga/coverage-gate.json` lists per-package metrics and reasons when skipped or failing.
- **Determinism levers:**
  - `COVERAGE_BASE_REF` — change-detection base (e.g., `main` or a SHA)
  - `COVERAGE_ALL=true` — force all packages to run regardless of diff
- **CI wiring:** Executed inside GA Gate before services start; same command is used locally.

## API Fuzzing Contracts

- **Command:** `pnpm fuzz:api`
- **Contracts:** `testing/ga-verification/api-fuzz-contracts.json` seeds two endpoints (`pipelines.create`, `audit.delivery`) with bounded mutations.
- **Bounds:**
  - Seed defaults to `20250102` (override via `API_FUZZ_SEED`).
  - Iterations default to 24 (override via `API_FUZZ_ITERATIONS`, capped at 96).
  - Budget is limited to `API_FUZZ_BUDGET_MS` (default 1000 ms) to prevent runaway fuzzing.
- **Failure replay:** The test logs the first rejection with its seed; re-run with the printed `API_FUZZ_SEED`/`API_FUZZ_ITERATIONS` to reproduce.
- **Side effects:** Purely in-memory validation; no network or filesystem calls beyond deterministic artifacts.

## Golden Path alignment

- Both gates execute inside `scripts/ga-gate.sh` as dedicated checks, ensuring `make ga` matches the GA workflow in CI.
- Outputs are stable across machines and Node versions because only summary metrics are consumed and seeds are fixed.

## Turborepo segmentation

- `turbo.json` now declares dedicated tasks for `lint`, `typecheck`, `build`, `test`, `coverage`, `fuzz`, and `smoke` with explicit inputs/outputs to keep caching correct per workspace segment.
- Golden Path commands can be replayed with `turbo run coverage --filter=<workspace>` and `turbo run fuzz --filter=<workspace>` when you need cached parity with CI.
