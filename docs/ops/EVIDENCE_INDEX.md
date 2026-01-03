# Operations Evidence Index

This index tracks the operational evidence packs generated for weekly cadence work.

## Naming convention

- Week label: `YYYY-WWW` using the ISO week date (UTC).
- Pack directory/tarball: `artifacts/ops-evidence/weekly/<week_label>_<shortsha>/` with an artifact
  named `ops-evidence_<week_label>_<shortsha>.tar.gz`.

## Adding a new entry

1. Trigger the **Weekly Ops Evidence Pack** workflow (see `docs/ops/WEEKLY_EVIDENCE_RUNBOOK.md`).
2. Copy the emitted JSON snippet from the workflow output.
3. Append the snippet to `docs/ops/EVIDENCE_INDEX.json` under `weeks`.
4. Add a short row to this markdown file summarizing the run.

### Markdown record format

| Week Label | Status | Artifact             | Notes                               |
| ---------- | ------ | -------------------- | ----------------------------------- |
| _TBD_      | _TBD_  | _add when generated_ | _Workflow-dispatched evidence pack_ |

### JSON record format

Each record in `docs/ops/EVIDENCE_INDEX.json` should follow:

```json
{
  "week_label": "2026-W01",
  "generated_at_utc": "2026-01-02T00:00:00Z",
  "commit_sha": "abc1234",
  "status": "pass",
  "notes": "first weekly pack",
  "artifact": {
    "name": "ops-evidence_2026-W01_abc1234.tar.gz",
    "url": "https://github.com/<org>/<repo>/actions/runs/<id>",
    "type": "workflow_run_artifact"
  }
}
```

Keep entries ordered by descending week so the newest evidence is easy to find.
