
# DR Drill Runbook

## Overview
This runbook describes how to execute and verify Disaster Recovery (DR) drills using the Resilience CLI. These drills are designed to be safe, repeatable, and auditable.

## Prerequisites
- Access to the `server/` directory.
- `tsx` installed (via `pnpm install` or `npx`).
- Environment variables configured (if running against real infra, though drills default to simulated/dry-run).

## 1. Running a Drill Locally

### Dry Run (Recommended First Step)
Always start with a dry run to verify the plan steps without executing them.

```bash
npx tsx server/src/dr/cli.ts server/src/dr/plans/backup-restore.json dry-run
```

**Expected Output:**
- A JSON report in `dist/dr/drill-report.json`
- A Markdown summary in `dist/dr/drill-report.md`
- Logs indicating `[DRY-RUN]` for execution steps.

### Execution Mode
To actually execute the drill (which may involve simulated components or real commands depending on the plan):

```bash
npx tsx server/src/dr/cli.ts server/src/dr/plans/backup-restore.json execute
```

**Safety Note:** Ensure you are targeting a non-production environment or using a safe plan like `backup-restore-rehearsal` which operates on temporary resources.

### Verify Only
To skip execution steps and only run verification checks (useful if you manually triggered a failover):

```bash
npx tsx server/src/dr/cli.ts server/src/dr/plans/failover-sim.json verify-only
```

## 2. Interpreting Reports
Reports are generated in `dist/dr/` (or `process.env.DR_REPORT_DIR`).

- **drill-report.md**: Human-readable summary. Check the "Status" field (SUCCESS/FAILURE) and review individual steps.
- **drill-report.json**: Machine-readable full log.

## 3. Rollback
If a drill fails, the orchestrator attempts to run defined rollback steps.
- Check the report for `ROLLBACK` steps.
- If automatic rollback fails, manually execute the commands listed in the `rollback` section of the plan JSON.

## 4. Adding New Plans
1. Create a JSON file in `server/src/dr/plans/`.
2. Define `steps` (exec, verify, manual, delay).
3. Define `rollback` steps.
4. Validate using `dry-run` mode.
