# Release vX.Y.Z — Upgrade & Migration Notes

Use this template to document everything operators and integrators need to perform a safe upgrade. Copy it into the corresponding release notes file in `docs/releases/` and replace all placeholders.

## Upgrade Notes

- **Pre-checks:** (e.g., confirm backups, freeze windows, maintenance notifications)
- **Service impact:** (expected downtime/zero-downtime steps)
- **Configuration changes:** (new env vars/flags with defaults and rollout guidance)
- **Upgrade steps:**
  1. Step-by-step commands/operators should run (include make/just commands when possible).
  2. Validation points after each step.
- **Rollback:** (exact command/manifest to revert, plus data reconciliation guidance)

## Migration Notes

- **Database/data migrations:** (describe migrations, backfill strategy, and verification queries)
- **API/contract changes:** (breaking or deprecations with compatibility windows)
- **Client/SDK actions:** (versions required, feature flags to enable compatibility)
- **Operational checks:** (dashboards/alerts to monitor specific to the migration)

## Post-Upgrade Validation

- **SLOs to verify:** (latency/error budgets to sample after upgrade)
- **Smoke tests:** (links to scripts or commands to run)
- **Owner approvals:** (who signs off and where to record evidence)
