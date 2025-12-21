# API Surface Inventory

**Generated:** October 2025
**Status:** Living Document

## Summary
This inventory tracks all detected API endpoints in the `intelgraph-server` codebase.

| Tier | Count |
|------|-------|
| Tier 0 | Critical (Auth, Admin) |
| Tier 1 | Core (Webhooks, Billing, Tenants) |
| Tier 2 | Internal/Auxiliary |

## Endpoint List

| Method | Path | Tier | Source File |
|--------|------|------|-------------|
| GET | `/api/admin/rate-limits/:userId` | Tier 0 | `server/src/app.ts` |
| POST | `/api/ai/adversary/generate` | Tier 2 | `server/src/routes/ai.ts` |
| GET | `/api/ai/capabilities` | Tier 2 | `server/src/routes/ai.ts` |
| GET | `/api/ai/job-status/:jobId` | Tier 2 | `server/src/routes/ai.ts` |
| GET | `/api/ai/models/status` | Tier 2 | `server/src/routes/ai.ts` |
| POST | `/api/ai/nl-graph-query/cache/clear` | Tier 2 | `server/src/routes/nl-graph-query.ts` |
| GET | `/api/ai/nl-graph-query/health` | Tier 2 | `server/src/routes/nl-graph-query.ts` |
| GET | `/api/ai/nl-graph-query/patterns` | Tier 2 | `server/src/routes/nl-graph-query.ts` |
| GET | `/api/billing/invoices` | Tier 1 | `server/src/routes/billing.ts` |
| POST | `/api/billing/invoices/generate` | Tier 1 | `server/src/routes/billing.ts` |
| POST | `/api/catalog/assets` | Tier 2 | `server/src/routes/data-governance-routes.ts` |
| GET | `/api/catalog/assets` | Tier 2 | `server/src/routes/data-governance-routes.ts` |
| GET | `/api/catalog/assets/:id` | Tier 2 | `server/src/routes/data-governance-routes.ts` |
| GET | `/api/costs/analysis` | Tier 2 | `server/src/routes/resource-costs.ts` |
| GET | `/api/er/quality/metrics` | Tier 2 | `server/src/routes/entity-resolution.ts` |
| POST | `/api/er/resolve-batch` | Tier 2 | `server/src/routes/entity-resolution.ts` |
| GET | `/api/governance/assets/:id/compliance` | Tier 2 | `server/src/routes/data-governance-routes.ts` |
| POST | `/api/governance/policies` | Tier 2 | `server/src/routes/data-governance-routes.ts` |
| GET | `/api/internal/command-console/incidents` | Tier 2 | `server/src/routes/internal/command-console.ts` |
| GET | `/api/internal/command-console/summary` | Tier 2 | `server/src/routes/internal/command-console.ts` |
| GET | `/api/internal/command-console/tenants` | Tier 2 | `server/src/routes/internal/command-console.ts` |
| GET | `/api/lineage/assets/:id` | Tier 2 | `server/src/routes/data-governance-routes.ts` |
| POST | `/api/lineage/edges` | Tier 2 | `server/src/routes/data-governance-routes.ts` |
| POST | `/api/lineage/nodes` | Tier 2 | `server/src/routes/data-governance-routes.ts` |
| POST | `/api/maestro/runs` | Tier 1 | `server/src/routes/maestro.ts` |
| GET | `/api/maestro/runs` | Tier 1 | `server/src/routes/maestro.ts` |
| GET | `/api/maestro/runs/:runId` | Tier 1 | `server/src/routes/maestro.ts` |
| GET | `/api/maestro/templates` | Tier 1 | `server/src/routes/maestro.ts` |
| POST | `/api/maestro/templates` | Tier 1 | `server/src/routes/maestro.ts` |
| GET | `/api/meta-orchestrator/agents` | Tier 2 | `server/src/routes/meta-orchestrator.ts` |
| POST | `/api/meta-orchestrator/agents` | Tier 2 | `server/src/routes/meta-orchestrator.ts` |
| POST | `/api/meta-orchestrator/agents/:id/heartbeat` | Tier 2 | `server/src/routes/meta-orchestrator.ts` |
| GET | `/api/meta-orchestrator/negotiations` | Tier 2 | `server/src/routes/meta-orchestrator.ts` |
| POST | `/api/meta-orchestrator/negotiations` | Tier 2 | `server/src/routes/meta-orchestrator.ts` |
| GET | `/api/meta-orchestrator/negotiations/:id` | Tier 2 | `server/src/routes/meta-orchestrator.ts` |
| POST | `/api/meta-orchestrator/negotiations/:id/proposals` | Tier 2 | `server/src/routes/meta-orchestrator.ts` |
| GET | `/api/narrative-sim/simulations` | Tier 2 | `server/src/routes/narrative-sim.ts` |
| POST | `/api/narrative-sim/simulations` | Tier 2 | `server/src/routes/narrative-sim.ts` |
| GET | `/api/narrative-sim/simulations/:id` | Tier 2 | `server/src/routes/narrative-sim.ts` |
| DELETE | `/api/narrative-sim/simulations/:id` | Tier 2 | `server/src/routes/narrative-sim.ts` |
| POST | `/api/narrative-sim/simulations/:id/actions` | Tier 2 | `server/src/routes/narrative-sim.ts` |
| POST | `/api/narrative-sim/simulations/:id/events` | Tier 2 | `server/src/routes/narrative-sim.ts` |
| POST | `/api/narrative-sim/simulations/:id/shock` | Tier 2 | `server/src/routes/narrative-sim.ts` |
| POST | `/api/narrative-sim/simulations/:id/tick` | Tier 2 | `server/src/routes/narrative-sim.ts` |
| POST | `/api/narrative-sim/simulations/batch` | Tier 2 | `server/src/routes/narrative-sim.ts` |
| POST | `/api/osint/prioritize` | Tier 2 | `server/src/routes/osint.ts` |
| GET | `/api/osint/queue` | Tier 2 | `server/src/routes/osint.ts` |
| POST | `/api/osint/score/:id` | Tier 2 | `server/src/routes/osint.ts` |
| POST | `/api/qaf/scan` | Tier 2 | `server/src/routes/qaf.ts` |
| POST | `/api/qaf/spawn` | Tier 2 | `server/src/routes/qaf.ts` |
| GET | `/api/qaf/telemetry` | Tier 2 | `server/src/routes/qaf.ts` |
| POST | `/api/quality/assets/:id/run-checks` | Tier 2 | `server/src/routes/data-governance-routes.ts` |
| POST | `/api/quality/rules` | Tier 2 | `server/src/routes/data-governance-routes.ts` |
| GET | `/api/query-previews/:id/stream` | Tier 2 | `server/src/routes/query-preview-stream.ts` |
| POST | `/api/scenarios/` | Tier 2 | `server/src/routes/scenarios.ts` |
| GET | `/api/scenarios/:id` | Tier 2 | `server/src/routes/scenarios.ts` |
| POST | `/api/scenarios/:id/modifications` | Tier 2 | `server/src/routes/scenarios.ts` |
| POST | `/api/scenarios/:id/resolve` | Tier 2 | `server/src/routes/scenarios.ts` |
| GET | `/api/scenarios/investigation/:id` | Tier 2 | `server/src/routes/scenarios.ts` |
| GET | `/api/siem-platform/alerts` | Tier 2 | `server/src/routes/siem-platform.ts` |
| GET | `/api/siem-platform/compliance/report` | Tier 2 | `server/src/routes/siem-platform.ts` |
| GET | `/api/siem-platform/events` | Tier 2 | `server/src/routes/siem-platform.ts` |
| POST | `/api/siem-platform/ingest` | Tier 2 | `server/src/routes/siem-platform.ts` |
| GET | `/api/stream/:streamId` | Tier 2 | `server/src/routes/stream.ts` |
| POST | `/api/stream/start` | Tier 2 | `server/src/routes/stream.ts` |
| POST | `/api/support/tickets` | Tier 2 | `server/src/routes/support-tickets.ts` |
| GET | `/api/support/tickets` | Tier 2 | `server/src/routes/support-tickets.ts` |
| GET | `/api/support/tickets/:id` | Tier 2 | `server/src/routes/support-tickets.ts` |
| PATCH | `/api/support/tickets/:id` | Tier 2 | `server/src/routes/support-tickets.ts` |
| DELETE | `/api/support/tickets/:id` | Tier 2 | `server/src/routes/support-tickets.ts` |
| POST | `/api/support/tickets/:id/comments` | Tier 2 | `server/src/routes/support-tickets.ts` |
| GET | `/api/support/tickets/:id/comments` | Tier 2 | `server/src/routes/support-tickets.ts` |
| POST | `/api/tenants/` | Tier 1 | `server/src/routes/tenants.ts` |
| GET | `/api/tenants/:id` | Tier 1 | `server/src/routes/tenants.ts` |
| GET | `/api/tickets/:provider/:externalId/links` | Tier 2 | `server/src/routes/ticket-links.ts` |
| POST | `/api/v1/search/rag-context` | Tier 1 | `server/src/routes/search-v1.ts` |
| POST | `/api/v1/search/retrieve` | Tier 1 | `server/src/routes/search-v1.ts` |
| POST | `/api/webhooks/` | Tier 1 | `server/src/routes/webhooks.ts` |
| GET | `/api/webhooks/` | Tier 1 | `server/src/routes/webhooks.ts` |
| GET | `/api/webhooks/:id` | Tier 1 | `server/src/routes/webhooks.ts` |
| PATCH | `/api/webhooks/:id` | Tier 1 | `server/src/routes/webhooks.ts` |
| DELETE | `/api/webhooks/:id` | Tier 1 | `server/src/routes/webhooks.ts` |
| GET | `/api/webhooks/:id/deliveries` | Tier 1 | `server/src/routes/webhooks.ts` |
| GET | `/api/workspaces/` | Tier 2 | `server/src/routes/workspaces.ts` |
| POST | `/api/workspaces/` | Tier 2 | `server/src/routes/workspaces.ts` |
| PUT | `/api/workspaces/:id` | Tier 2 | `server/src/routes/workspaces.ts` |
| DELETE | `/api/workspaces/:id` | Tier 2 | `server/src/routes/workspaces.ts` |
| POST | `/disclosures/analytics` | Tier 2 | `server/src/routes/disclosures.ts` |
| POST | `/disclosures/export` | Tier 2 | `server/src/routes/disclosures.ts` |
| GET | `/disclosures/export` | Tier 2 | `server/src/routes/disclosures.ts` |
| GET | `/disclosures/export/:jobId` | Tier 2 | `server/src/routes/disclosures.ts` |
| GET | `/disclosures/export/:jobId/download` | Tier 2 | `server/src/routes/disclosures.ts` |
| POST | `/disclosures/runtime-bundle` | Tier 2 | `server/src/routes/disclosures.ts` |
| GET | `/disclosures/runtime-bundle/:bundleId/checksums` | Tier 2 | `server/src/routes/disclosures.ts` |
| GET | `/disclosures/runtime-bundle/:bundleId/download` | Tier 2 | `server/src/routes/disclosures.ts` |
| GET | `/disclosures/runtime-bundle/:bundleId/manifest` | Tier 2 | `server/src/routes/disclosures.ts` |
| GET | `/metrics` | Tier 2 | `server/src/app.ts` |
| GET | `/monitoring/health` | Tier 2 | `server/src/routes/monitoring.ts` |
| GET | `/monitoring/health/database` | Tier 2 | `server/src/routes/monitoring.ts` |
| GET | `/monitoring/health/info` | Tier 2 | `server/src/routes/monitoring.ts` |
| GET | `/monitoring/health/live` | Tier 2 | `server/src/routes/monitoring.ts` |
| GET | `/monitoring/health/ml` | Tier 2 | `server/src/routes/monitoring.ts` |
| GET | `/monitoring/health/neo4j` | Tier 2 | `server/src/routes/monitoring.ts` |
| GET | `/monitoring/health/quick` | Tier 2 | `server/src/routes/monitoring.ts` |
| GET | `/monitoring/health/ready` | Tier 2 | `server/src/routes/monitoring.ts` |
| GET | `/monitoring/health/redis` | Tier 2 | `server/src/routes/monitoring.ts` |
| GET | `/monitoring/health/system` | Tier 2 | `server/src/routes/monitoring.ts` |
| GET | `/monitoring/metrics` | Tier 2 | `server/src/routes/monitoring.ts` |
| POST | `/monitoring/metrics/business` | Tier 2 | `server/src/routes/monitoring.ts` |
| POST | `/monitoring/telemetry/dora` | Tier 2 | `server/src/routes/monitoring.ts` |
| POST | `/monitoring/telemetry/events` | Tier 2 | `server/src/routes/monitoring.ts` |
| POST | `/monitoring/web-vitals` | Tier 2 | `server/src/routes/monitoring.ts` |
| GET | `/search/evidence` | Tier 1 | `server/src/app.ts` |
