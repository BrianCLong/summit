# Weekly Ops Evidence Pack Runbook

This runbook describes how to generate and index the weekly operational evidence pack.

## When to run

- Trigger once per week on the first business day (or Monday) in UTC.
- Align the pack label to the ISO week date (`YYYY-WWW`).

## Workflow: Weekly Ops Evidence Pack

- Path: `.github/workflows/weekly-ops-evidence.yml`
- Trigger: `workflow_dispatch` (manual)
- Inputs:
  - `ref` (default: `main`): commit or branch to package.
  - `week_label` (optional): ISO week label; leave blank to compute automatically in UTC.
  - `status` (default: `pass`): one of `pass`, `fail`, or `partial`.
  - `notes` (optional): short freeform context for reviewers.

### Steps to run

1. Go to **Actions → Weekly Ops Evidence Pack → Run workflow**.
2. Choose the target ref and (optionally) override the week label, status, or notes.
3. Dispatch the run. The workflow computes the week label in UTC and generates a tarball at
   `artifacts/ops-evidence/weekly/<week_label>_<shortsha>/` named
   `ops-evidence_<week_label>_<shortsha>.tar.gz`.
4. Download the uploaded workflow artifact of the same name. If long-term retention is required,
   copy it into a release asset or external storage before the workflow artifact expires.

### Updating the evidence index

1. Copy the JSON snippet emitted in the workflow output (from the `Emit evidence index JSON snippet` step).
2. Append the snippet to `docs/ops/EVIDENCE_INDEX.json` under `weeks` and update the markdown table in
   `docs/ops/EVIDENCE_INDEX.md`.
3. Commit changes in a follow-up PR if you update the index.

### Validation checks

- Local helper: `./scripts/ops/compute_iso_week.sh --json` (ensures deterministic week label).
- Pack generator: `./scripts/verification/generate_ops_evidence_pack.sh --output-dir artifacts/ops-evidence/weekly/<week_label>_<shortsha>`.
- Confirm the workflow artifact exists and is named `ops-evidence_<week_label>_<shortsha>.tar.gz`.

### Rollback

To remove the cadence, revert:

- `.github/workflows/weekly-ops-evidence.yml`
- `scripts/ops/compute_iso_week.sh`
- `scripts/verification/generate_ops_evidence_pack.sh`
- `docs/ops/WEEKLY_EVIDENCE_RUNBOOK.md` and the `docs/ops/EVIDENCE_INDEX.*` files
