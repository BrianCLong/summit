# Item 003 — RAG console freshness formatting

- Project: https://github.com/users/BrianCLong/projects/19
- Status: Backlog
- Target surface: Symphony RAG Console metadata

## Problem statement

Corpus freshness shows a vague relative value (e.g., `10m ago`) without a timezone or absolute timestamp, and file counts are unformatted. Users cannot audit when the index was updated.

## Acceptance criteria

- Display last ingest time using `formatAbsoluteTime` (UTC) with a relative helper in a tooltip or secondary label.
- File/count metrics use `formatNumber` with grouping; durations/latencies carry units.
- Add tests for the freshness presenter to ensure both relative and absolute values render.
- Update any loading placeholders to avoid raw numeric strings.
