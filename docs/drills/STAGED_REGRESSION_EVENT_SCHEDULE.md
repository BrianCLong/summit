# Staged Regression Event Schedule

**Cadence:** Once per sprint (week 2, Thursday) unless a freeze window is active.

## Upcoming Events

| Sprint Window    | Scheduled Date (UTC)   | Owner           | Scope                             | Notes                                                                   |
| ---------------- | ---------------------- | --------------- | --------------------------------- | ----------------------------------------------------------------------- |
| 2025-12 Sprint 2 | 2025-12-30 15:00–16:00 | Release Captain | Canary regression + auto-rollback | Evidence bundle stored under `.evidence/disclosure-packager/` (EVID-2). |

## Execution Checklist (Per Event)

1. Stage a controlled regression in canary (fault injection or bad config toggle).
2. Confirm SLO regression triggers automated rollback.
3. Capture timestamps, logs, and rollback audit entries.
4. Package evidence bundle and store in disclosure pack storage (EVID-2).

## References

- `docs/release-reliability/README.md` (canary + rollback flow)
- `scripts/release/canary-rollback-playbook.sh` (rollback audit logging)
