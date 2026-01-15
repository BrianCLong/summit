# Issue Triage Automation

This repository uses a GitHub Actions workflow to keep issues actionable and consistently tagged.

## What it does

- Marks issues **status/stale** after 30 days without updates and comments to request a refresh.
- Restores issues to **status/actionable** when new activity occurs within 7 days of the latest update.
- Applies exactly one severity label (`severity/P0`–`severity/P3`), defaulting to `severity/P2` when no signals are found.
- Applies one area label based on keywords, defaulting to `area/needs-triage` when subsystem ownership is unclear.
- Ensures required labels exist so triage never fails on missing metadata.

## How labels are chosen

- **Severity:** Looks for `P0`–`P3`, `sev*`, or descriptive words like "critical", "major", "medium", and "low" in the issue title or body.
- **Subsystem ownership:** Matches keywords such as `frontend`, `API`, `GraphQL`, `Kubernetes`, `auth`, or `docs` to the nearest area label.
- **Status:** Calculates days since the last update to decide between `status/stale` and `status/actionable`.

## Operation schedule

- Runs automatically on new, edited, or reopened issues.
- Executes daily at 06:00 UTC to sweep existing open issues.
- Can be triggered manually via **Run workflow** in GitHub.

## Opting into or out of automation

- Automation skips pull requests entirely.
- Add fresh comments or edits to move a stale issue back to actionable status.
- Update issue text with clearer severity keywords or subsystem hints if the automatic assignment needs adjustment.
