# GA Tenant DR Drill

> **Version**: 1.0  
> **Last Updated**: 2026-02-05  
> **Status**: Ready (execution deferred pending scheduled window)

## Purpose

Define the GA tenant disaster recovery drill flow and capture evidence in a repeatable, audited way.

## Execution

```bash
# Dry-run validation (default)
./scripts/dr/ga-tenant-drill.sh --tenants "tenant-a,tenant-b"

# Execute drill (requires approved window)
MODE=execute ./scripts/dr/ga-tenant-drill.sh --tenants "tenant-a,tenant-b"
```

## Evidence

- `artifacts/dr/ga-tenant-drill.json`
- `scripts/dr/backup-verification.sh`
- `scripts/dr/dr_drill.ts`

## Notes

- Coordinate with on-call and release captain before `MODE=execute`.
- Ensure monitoring dashboards and alert routing are active during the drill.
