# Automation Handbook

**Role:** Automation Operator / Release Captain
**Scope:** GA Automation, Merge Train, Evidence Collection

This handbook provides the "golden commands" for operating the Summit automation suite. All commands are designed to be idempotent, safe (plan-by-default), and consistent.

## Quick Reference

| Task | Command | Description |
| :--- | :--- | :--- |
| **Check Status** | `pnpm ga:status` | Validates drift, evidence, and tool health. |
| **Merge Train** | `pnpm merge-train:run` | Runs triage, generates dashboard, updates branches (plan-only default). |
| **Evidence** | `pnpm compliance:evidence` | Generates a new evidence bundle. |
| **Drift Check** | `pnpm compliance:check` | Verifies current artifacts against latest baseline. |
| **Scaffold Claim** | `pnpm ga:claim:scaffold` | (TBD) Creates a new assurance claim. |

## Common Tasks

### 1. Verify Automation Health
Before starting a release train or audit, ensure the automation machinery is healthy.

```bash
pnpm ga:status
```

**Success:** All checks pass.
**Failure:** Follow the output logs. Usually involves regenerating evidence or fixing drift.

### 2. Run the Merge Train
To process PRs and generate a triage report:

```bash
# Dry Run (Plan)
pnpm merge-train:run

# Execute (Apply) - Generates artifacts
pnpm merge-train:run --mode=apply
```

**Artifacts:** `artifacts/merge-train/<timestamp>/`
- `triage-report.json`: Machine-readable state.
- `triage-summary.md`: Human-readable summary for PRs.

### 3. Generate Compliance Evidence
To capture a snapshot of the system for SOC2/Audit:

```bash
pnpm compliance:evidence --mode=apply
```

**Artifacts:** `artifacts/evidence/auditor-bundle-<timestamp>/`
- Contains controls, snapshots, and manifest.

### 4. Verify/Drift Check
To ensure the repo hasn't drifted from the last evidence snapshot:

```bash
pnpm compliance:check
# OR
pnpm security:drift-check
```

**Drift Detected?**
- If intentional: Regenerate evidence (`pnpm compliance:evidence --mode=apply`).
- If unintentional: Revert changes to protected files.

## Outputs & Artifacts

All automation scripts write to the `artifacts/` directory by default.

| Category | Path Pattern | Content |
| :--- | :--- | :--- |
| **Evidence** | `artifacts/evidence/auditor-bundle-*/` | Compliance snapshots, manifests. |
| **Merge Train** | `artifacts/merge-train/merge-train-*/` | Triage reports, dashboards. |
| **Drift** | `artifacts/drift-check/drift-report-*/` | Drift analysis logs. |
| **Status** | `artifacts/ga-status/status-*/` | System health snapshots. |

## Troubleshooting

### "gh" CLI not found
The merge train scripts require the GitHub CLI (`gh`).
- **Fix:** Install `gh` and run `gh auth login`.
- **Workaround:** Provide a `prs.json` file via `--source` if supported, or place it in the root.

### Drift Detected
The system detects changes to files that are part of the evidence set.
- **Fix:** Run `pnpm compliance:evidence --mode=apply` to "accept" the new state as the baseline.

### Module Not Found (commander, etc.)
Ensure you have installed dependencies.
- **Fix:** `pnpm install`

## Modes: Plan vs. Apply

- **`--mode=plan` (Default):** Read-only. prints what would happen. Safe to run anywhere.
- **`--mode=apply`:** Writes changes, generates artifacts, or updates remote state.
