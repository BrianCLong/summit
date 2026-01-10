# Verified CI Topology

## Workflows

| Workflow File | Trigger | Key Jobs | Description |
| :--- | :--- | :--- | :--- |
| `.github/workflows/ci.yml` | PR, Push (main) | `lint`, `verify`, `test`, `golden-path`, `reproducible-build` | Main blocking CI loop. **Note:** `test` job is currently `continue-on-error: true`. |
| `.github/workflows/ga-gate.yml` | PR, Push (main) | `ga-gate` | Runs `make ga`. 15m timeout. |
| `.github/workflows/test-quarantine.yml` | Workflow Run (CI), Schedule, Dispatch | `manage-quarantine` | Manages and reports on flaky tests. |
| `.github/workflows/ga-risk-gate.yml` | Called by `ci.yml` | `risk-gate` | Assesses risk level of changes. |
| `.github/workflows/ci-security.yml` | Called by `ci.yml` | `security` | Security scans (Snyk, etc.). |

## Key Scripts

| Script Path | Purpose |
| :--- | :--- |
| `scripts/release/manage_test_quarantine.sh` | Manages `test-quarantine.json` and reporting. |
| `scripts/ga-gate.sh` (via `make ga`) | Entrypoint for GA verification. |
| `server/scripts/verify-*.ts` | Verification scripts run by `pnpm verify`. |

## Bottlenecks & Issues

1.  **Tests are Non-Blocking:** `ci.yml` has `test` job set to `continue-on-error: true` due to TypeScript/ESM issues. This hides failures.
2.  **Quarantine Not Enforced:** `test-quarantine.yml` manages the list, but `ci.yml` does not appear to exclude these tests from the main run, nor does it run them in a separate non-blocking job.
3.  **Missing Deterministic Chunking:** Tests run as a single batch (`pnpm test:unit`), which can lead to timeouts or slow feedback.
4.  **Implicit Timeouts:** Most jobs rely on default GitHub Actions timeouts (6h), except `ga-gate` (15m).

## Plan

1.  **Enforce Quarantine:** Update `ci.yml` to exclude quarantined tests and run them separately.
2.  **Chunk Tests:** Split tests deterministically to improve parallelism and reliability.
3.  **Fix Test Blocking:** Aim to make tests blocking again by isolating the flaky/broken ones into quarantine.
