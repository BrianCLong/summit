# EVID-2 Staged Regression Drill — 2025-12-27

## Schedule

- **Cadence**: Per sprint (week 2)
- **Scheduled window**: 2025-12-30 15:00–16:00 UTC
- **Owner**: Release Captain
- **Scope**: Canary regression + auto-rollback verification

## Execution Summary

- **Environment**: stage
- **Service**: api
- **Canary failure trigger**: staged regression drill (fault injection)
- **Rollback verification**: automated rollback playbook executed in dry-run mode

## Timeline (UTC)

- **2025-12-27T05:52:30Z** — Canary rollback playbook invoked (dry run).
- **2025-12-27T05:52:30Z** — Rollback audit log recorded.

## Logs (excerpt)

```
2025-12-27T05:52:30+00:00 Initiating rollback for api-stage (revision: 2025.12.27-rc1)
2025-12-27T05:52:30+00:00 Reason: Staged regression drill - canary failure
2025-12-27T05:52:30+00:00 Dry run enabled. Not executing helm rollback.
2025-12-27T05:52:30+00:00 Rollback recorded to .evidence/disclosure-packager/EVID-2-canary-rollback.json
```

## Evidence Bundle Output

- **Bundle file**: `.evidence/disclosure-packager/EVID-2-evidence-bundle.json`
- **Rollback audit log**: `.evidence/disclosure-packager/EVID-2-canary-rollback.json`

## Notes

- This drill used the rollback playbook in `--dry-run` mode to verify automated rollback wiring and audit logging without modifying Helm state.
- Full rollback validation should be performed during the scheduled window with Helm connectivity enabled.
