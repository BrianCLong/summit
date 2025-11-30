# Execution Plan Tracker CLI

This CLI manages the delivery batches defined in `execution-plan.json` and produces dashboard-ready markdown for reports.

## Commands
- `dashboard` — renders the markdown table for the project board.
- `weekly <label>` — prints the weekly report scaffold for the provided label (e.g., `Week 3`).
- `update <batchId> key=val ...` — updates a batch (status, progress, owner, blockers, targetDate, notes).
- `metrics key=val ...` — updates numeric rollout metrics (`ciPassRate`, `coverage`, `prsMerged`, `deploymentMinutes`, `productionIncidents`).
- `validate` — validates the plan schema without modifying the file.
- `help` — prints the command reference.

Set `EXECUTION_PLAN_PATH` to point to an alternate plan file if you want to test drafts without touching the primary plan.

## Examples
```bash
# Render dashboard
node tools/execution/batchTracker.js dashboard

# Update batch status and blockers
node tools/execution/batchTracker.js update batch-1 status=in-progress progress=35 owner=alice blockers=batch-0,batch-2

# Update metrics after a release
node tools/execution/batchTracker.js metrics ciPassRate=92 coverage=86 deploymentMinutes=18 prsMerged=12

# Validate a plan file
EXECUTION_PLAN_PATH=tmp/plan.json node tools/execution/batchTracker.js validate
```
