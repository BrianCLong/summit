# Rollback Playbook

## Immediate Steps (feature incident)

1. Disable related feature flags in Admin Console (or via CLI below).
2. Scale down canary (if partial rollout) and switch traffic back.
3. Helm rollback to last good rev: `helm history <rel>` then `helm rollback <rel> <REV>`.
4. If schema touched, run `ops/db/rollback --to <safe-tag>`.
5. Verify golden signals: error rate, p95 latency, saturation; confirm audit logs.

## CLI helpers

```
./ops/rollout --service symphony-api --flag your\_flag --percent 0 --disable
```

## Evidence & Audit

- Capture Grafana/Jaeger screenshots, CI run ID, Git SHA, and reason-for-access.
- File incident with timeline and attach metrics.
