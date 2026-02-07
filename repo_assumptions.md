# Repo Assumptions & Validation

## Verified vs Assumed

| Verified | Assumed |
| --- | --- |
| `docs/` exists and contains standards/security/ops subdirectories. | Current CLI includes a native `summit intel` command (added in this change set). |
| `scripts/` exists and is a suitable location for monitoring drift scripts. | CI conventions accept a dedicated `intel-drift` workflow name. |
| `intel/schema/` exists for JSON schemas. | The nightly drift job should fail on material deltas by default. |
| `intel/` exists for intelligence artifacts. | `artifacts/intel/<item>` is an approved location for baseline reports. |
| `.github/workflows/` exists for CI workflows. | `INTEL_ENABLE_INGEST` remains the default gate for ingest execution. |
| `docs/roadmap/STATUS.json` is the execution ledger to update per change. | No additional policy exceptions are required for this pack. |

## Must-Not-Touch List

- Lockfiles (`pnpm-lock.yaml`, `package-lock.json`, `Cargo.lock`)
- Release automation (`.github/workflows/*release*`, `scripts/release/*`)
- Security policy roots (`docs/governance/*`, `docs/ga/*`, `agent-contract.json`)
