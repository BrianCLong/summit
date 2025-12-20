# Legacy Code & Artifacts Inventory

This document tracks the status of legacy, obsolete, or deprecated code and artifacts within the Summit monorepo.

## Status Definitions

- **Active**: Currently in use, critical path.
- **Deprecated**: Still works but scheduled for removal; avoid new dependencies.
- **Legacy**: Old code kept for reference/history; likely not functional.
- **Dead**: Confirmed unused; safe to delete.
- **Archived**: Moved to `archive/` for historical preservation.

## Inventory

### Scripts

| Path | Status | Notes | Action |
| bound | --- | --- | --- |
| `start-dev.sh` | **Deprecated** | Legacy wrapper. Prefer `make up` or `npm run dev`. | Keep as alias for now, fixed port output. |
| `demo-composer-vnext*.sh` | **Archived** | Old demo scripts for vNext sprints. | Moved to `archive/scripts/`. |
| `deploy-dev.sh` | **Archived** | Old deployment script. CI uses `deploy-dev.yml`. | Moved to `archive/scripts/`. |
| `deploy-intelgraph-dev.sh` | **Archived** | Old deployment script. | Moved to `archive/scripts/`. |
| `deploy-to-aws.sh` | **Archived** | Old deployment script. | Moved to `archive/scripts/`. |
| `run_local.sh` | **Dead** | Redundant. | Deleted. |
| `test_local.sh` | **Dead** | Redundant. | Deleted. |
| `setup-ui.sh` | **Archived** | Old setup script. | Moved to `archive/scripts/`. |
| `start-conductor.sh` | **Archived** | Redundant start script. | Moved to `archive/scripts/`. |
| `start-maestro-dev.sh` | **Archived** | Redundant start script. | Moved to `archive/scripts/`. |
| `start.sh` | **Archived** | Redundant start script. | Moved to `archive/scripts/`. |
| `start_maestro.sh` | **Archived** | Redundant start script. | Moved to `archive/scripts/`. |
| `stop-dev.sh` | **Archived** | Wrapper for `docker-compose down`. | Moved to `archive/scripts/`. |
| `transition_to_phase4.sh` | **Archived** | One-off phase transition script. | Moved to `archive/scripts/`. |
| `simple_transition_to_phase4.sh` | **Archived** | One-off phase transition script. | Moved to `archive/scripts/`. |
| `mark_phase3_complete.sh` | **Archived** | One-off phase completion script. | Moved to `archive/scripts/`. |
| `ubunti-dev-plus.sh` | **Dead** | Typo/Redundant. | Deleted. |
| `ubuntu-dev-plus.sh` | **Archived** | Old dev setup script. | Moved to `archive/scripts/`. |
| `user-data-*.sh` | **Dead** | Cloud-init scripts, likely experiments. | Deleted. |
| `release-captain.sh` | **Active** | Used by `release-captain.yml`. | Keep. |

### Directories

| Path | Status | Notes | Action |
| bound | --- | --- | --- |
| `green-lock-ledger/` | **Archived** | Deprecated recovery ledger. | Moved to `archive/`. |
| `october2025/` | **Active?** | Referenced in workflows, likely future planning. | Keep. |
| `archive/` | **Active** | Destination for archived items. | Keep. |
| `.archive/` | **Legacy** | Old archive folder. | Keep or merge? Leaving for now. |

### Files

| Path | Status | Notes | Action |
| bound | --- | --- | --- |
| `*.log` (root) | **Dead** | Old log files. | Deleted. |
| `*.zip`, `*.tgz` (root) | **Dead** | Artifact bundles. | Deleted. |
| `reproducer_*.py` | **Dead** | Fuzzer outputs. | Deleted. |
| `failing_cases.txt` | **Dead** | Fuzzer output. | Deleted. |
| `validation-report-*.txt` | **Dead** | Old reports. | Deleted. |

## Green Lock Ledger

The `green-lock-ledger` functionality has been migrated to `prov-ledger`. The directory and associated scripts (`scripts/recover_orphans_from_bundle.sh`, etc.) have been archived.
