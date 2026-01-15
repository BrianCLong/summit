# Weekly Ops Evidence Runbook

This runbook explains how to run the manual weekly ops evidence workflow, how to collect the
artifacts it produces, and how to record the resulting index entry.

## When to run

- Run every Monday at 09:00 UTC (adjust earlier if a holiday would delay the cadence).
- Use the default `main` ref unless a release or hotfix branch requires evidence for a specific
  commit.

## Triggering the workflow

Workflow: `.github/workflows/weekly-ops-evidence.yml` (manual `workflow_dispatch`). Inputs:

- `ref` (string, default `main`): branch or tag to evaluate.
- `week_label` (optional): ISO week label `YYYY-Www`; leave blank to compute from current UTC date.
- `status` (enum: `pass` | `fail` | `partial`, default `pass`).
- `notes` (optional string): brief context for the run.

### Steps

1. Navigate to **Actions → Weekly Ops Evidence Cadence**.
2. Click **Run workflow**, select the target `ref`, and optionally override `week_label`, `status`,
   or `notes`.

## Outputs

Each run produces:

- Artifact: `ops-evidence_weekly_<week_label>_<shortsha>.tar.gz` uploaded from
  `artifacts/ops-evidence/weekly/<week_label>_<shortsha>/`.
- JSON snippet: `evidence-index-entry.json` saved as a workflow artifact and printed in the logs.
  The snippet follows the `docs/ops/EVIDENCE_INDEX.json` schema and includes the workflow run URL
  and artifact reference.

## Recording the evidence

1. Download the `evidence-index-entry.json` artifact and copy its JSON object.
2. Open `docs/ops/EVIDENCE_INDEX.json` and append the JSON object to the `entries` array.
3. Update `docs/ops/EVIDENCE_INDEX.md` by adding a table row with the new entry values (ID,
   kind=`weekly`, ISO week, status, artifact reference, and any notes).

## Validation

- Validate ISO week computation locally (UTC):

  ```bash
  scripts/ops/compute_iso_week.sh 2024-12-30  # Expect 2025-W01
  scripts/ops/compute_iso_week.sh 2025-01-05  # Expect 2025-W01
  ```

- Verify index formatting before committing:

  ```bash
  jq . docs/ops/EVIDENCE_INDEX.json
  ```

- Optional: use `scripts/verification/emit_evidence_index_entry.sh` to regenerate the snippet with a
  custom artifact URL or notes.

## Retention and export

- Workflow artifacts retain the default GitHub retention policy unless adjusted by repository
  administrators. Download and store the tarball in long-term evidence storage after review.
- If an export workflow exists, run it only after confirming checksum and provenance of the
  generated tarball; ensure exports stay disabled by default.

## Rollback

- To rollback, delete `.github/workflows/weekly-ops-evidence.yml`, remove the helper scripts under
  `scripts/ops/` and `scripts/verification/`, and revert `docs/ops/EVIDENCE_INDEX.*` changes.
