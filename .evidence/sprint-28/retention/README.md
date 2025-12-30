# Sprint 28 — Retention & Deletion Evidence

This folder aggregates proof for Epic C retention execution.

Include:

- `job-config.yaml`: Maestro/cron job definition with schedules, dataset coverage, and legal hold handling.
- `run-report.json`: sample run summary showing dataset IDs, deletion/archive counts, and durations.
- `audit-log.ndjson`: append-only audit entries emitted by the job, including legal hold skips.
- `exceptions.md`: documented handling for legal holds and failure retries.

Artifacts must be reproducible from fixtures; avoid mutable timestamps without seed context.
