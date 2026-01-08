---
title: Restore Promise Tracker weekly health report for 2025-W51
labels: [release-train, P0]
owner: release-eng
---

## Context

The Promise Tracker workflow is supposed to post a weekly health issue, but no 2025-W51 metrics exist and `.promise-tracker` data is absent. Tool installation currently fails in this environment because the npm registry is blocked.

## Acceptance criteria

- Run `pnpm run health --ci` in `tools/promise-tracker` (or equivalent offline execution) and capture metrics for Total Items, Doc-Only, and Stale In-Progress.
- Commit the resulting health summary to `tools/promise-tracker/reports/weekly-health-2025-w51.md`, including the command output snippet and timestamp.
- Ensure `.promise-tracker/` is initialized (config + backlog) and wired into CI so the weekly scheduled run can publish metrics without manual intervention.
- Add a comment to the release-train tracker linking the completed report and indicating whether thresholds pass.
