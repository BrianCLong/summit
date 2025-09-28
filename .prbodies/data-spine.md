## Summary

- Establish Data Spine schema governance (registry service + CLI) with semver linting and compatibility gates.
- Enable CDC + residency controls and OpenLineage telemetry with dashboards, alerts, and synthetic probes.
- Enforce cosign provenance checks in CI and cluster admission.

## Testing

- `npm test -- services/schema-registry/schemaRegistry.test.js services/data-spine/lineageEmitter.test.js`
- `npx playwright test synthetics/journeys/data-spine.probe.ts`

## Evidence

- `.evidence/data-spine/2025-02-17-sprint1.md`
- Grafana dashboard: `dashboard/grafana/data-spine-lag.json`
- Lineage UI capture: `.evidence/data-spine/lineage-ui.png`
