# GA-Locked Frontend Surface Registry

**Version:** 1.0
**Status:** Active

This registry enumerates GA-locked, elevated-review, and frozen frontend surfaces. It is the
canonical reference for PR gating and policy enforcement.

**Machine-readable source:** `policies/rego/data/frontend-governance.json`

## GA-Locked Surfaces (elevated governance review required)

- `apps/web/src/pages/**`
- `apps/web/src/features/**`
- `apps/web/src/components/**`
- `apps/web/src/panes/**`
- `apps/web/src/graphs/**`
- `apps/web/src/hud/**`
- `apps/web/src/summitsight/**`
- `apps/web/src/securiteyes/**`
- `client/src/**`

## Elevated Review Surfaces (governance label required)

- `apps/web/src/governance/**`
- `apps/web/src/telemetry/**`
- `apps/web/src/config.ts`
- `apps/web/src/theme/**`
- `apps/web/src/theme.ts`
- `apps/web/src/contexts/**`

## Frozen Surfaces (emergency fixes only)

- `apps/web/ingest-wizard/**`
- `apps/web/report-studio/**`
- `apps/web/src/pages/GovernanceDashboard.tsx`
- `apps/web/src/pages/ReportsPage.tsx`

## Update Rules

- Any change to this registry must also update the machine-readable policy data file.
- Frozen surfaces require the `frontend/emergency-exception` label and a documented rollback plan.
