# Database Migrations

**Status:** 🔴 MISSING

This directory should contain the migration scripts to bring the Switchboard schema (`schema.sql`) up to parity with the Enterprise Core schema defined in `server/src/db/migrations/postgres/009_create_companyos_operational_tables.sql`.

## Required Tables
- `incidents`
- `deployments`
- `slo_violations`
- `alerts`
- `runbooks`
- `runbook_executions`
- `on_call_schedules`
- `postmortems`
- `adrs`
- `roadmap_items`

See [../BUILD_MAP.md](../BUILD_MAP.md) for details.
