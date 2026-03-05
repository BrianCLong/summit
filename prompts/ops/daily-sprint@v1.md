# Daily Sprint Ops Log (v1)

## Purpose

Create a daily sprint operations log that captures evidence-first snapshots, a short execution plan, and end-of-day status for the Summit repo. Ensure the output aligns with governance and execution invariants.

## Inputs

- Repository status (`git status -sb`).
- Top open PRs (most recent).
- Open issues with GA/security/governance/bolt/osint labels.
- Any blockers or Governed Exceptions encountered during scans.

## Required Outputs

- `docs/ops/DAILY_SPRINT_<YYYY-MM-DD>.md` with:
  - Evidence bundle (raw command outputs).
  - Sprint plan (3-6 tasks).
  - Execution log, commands run, end-of-day report.
- `docs/roadmap/STATUS.json` updated with current timestamp and revision note.

## Constraints

- Evidence-first: record raw outputs before narrative summaries.
- Do not bypass governance or security gates.
- If external systems fail, document as Governed Exceptions with the exact error output.
