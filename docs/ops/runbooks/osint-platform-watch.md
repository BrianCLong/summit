# OSINT Platform Watch Runbook

## Local Run
```
pnpm platform-watch:run --date=YYYY-MM-DD --fixtures=tests/platform-watch/fixtures
```

## Artifacts
- `artifacts/platform-watch/<YYYY-MM-DD>/report.json`
- `artifacts/platform-watch/<YYYY-MM-DD>/report.md`
- `artifacts/platform-watch/<YYYY-MM-DD>/metrics.json`
- `artifacts/platform-watch/<YYYY-MM-DD>/stamp.json`
- `artifacts/platform-watch/<YYYY-MM-DD>/kg.json`

## Drift Incident
- Drift is detected when no-change claims conflict with evidence update signals.
- Escalate if drift persists for 3+ consecutive days.

## Disablement
- Set `PLATFORM_WATCH_ENABLED=0` or disable the scheduled workflow.

## Rotation
- Delete artifacts older than retention window.
