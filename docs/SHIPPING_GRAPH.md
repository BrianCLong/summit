# Shipping Graph

This document captures the buildable units that currently "ship" from this repository and how they relate to one another. It intentionally favors clarity and ownership placeholders over exhaustive wiring so teams can keep the dependency graph current without moving code.

## Canonical buildable units

| Name                 | Type         | Path                      | Purpose                                                                                      | Entrypoint                        | Owner |
| -------------------- | ------------ | ------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------- | ----- |
| Web App              | frontend     | `apps/web`                | Primary analyst-facing UI for the Summit/IntelGraph workflow.                                | _TODO: pnpm scope + build target_ | _TBD_ |
| Gateway              | edge/service | `apps/gateway`            | Front-door API gateway that fronts web + internal services.                                  | _TODO: start/build target_        | _TBD_ |
| IntelGraph API       | backend      | `apps/intelgraph-api`     | GraphQL/REST surface for investigations, entities, relationships, and copilot flows.         | _TODO: start/build target_        | _TBD_ |
| Server (legacy)      | backend      | `apps/server`             | Legacy API surface kept for backward compatibility while traffic migrates to IntelGraph API. | _TODO: start/build target_        | _TBD_ |
| Observability bundle | tooling      | `apps/observability`      | Dashboards, alerting rules, and probes that ship with the platform.                          | _TODO: packaging target_          | _TBD_ |
| Workflow Engine      | service      | `apps/workflow-engine`    | Orchestrates longer-running workflows and scheduled jobs.                                    | _TODO: start/build target_        | _TBD_ |
| Analytics Engine     | service      | `apps/analytics-engine`   | Graph/ML analytics services consumed by the API layer.                                       | _TODO: start/build target_        | _TBD_ |
| Compliance Console   | frontend     | `apps/compliance-console` | Governance + compliance surface area for administrators.                                     | _TODO: pnpm scope + build target_ | _TBD_ |
| Packages (shared)    | libraries    | `packages/`               | Shared SDKs, domain models, and helpers used across shipping apps/services.                  | _TODO: publish/build target_      | _TBD_ |
| Services (shared)    | services     | `services/`               | Specialized deployables (e.g., authz-gateway) consumed behind the gateway.                   | _TODO: start/build target_        | _TBD_ |

> Tip: keep entries coarse-grained; list only buildable units that have a release artifact or deployment target.

## How units compose

- **User flow:** `apps/web` (and other UIs like `apps/compliance-console`) talk to `apps/gateway`, which routes requests to `apps/intelgraph-api` or other backend services.
- **Backend layering:** `apps/intelgraph-api` depends on shared logic in `packages/` and may delegate specialized tasks to services under `services/` or domain-specific apps (e.g., `apps/analytics-engine`, `apps/workflow-engine`).
- **Data + observability:** Observability assets in `apps/observability` and infrastructure helpers in `docs/_meta` support the shipping graph but do not sit on the hot path.
- **Legacy surface area:** `apps/server` remains deployable while traffic is migrated; it should not gain new dependencies without an exit plan.

Keep the table and bullets lightweight—update paths, owners, and entrypoints as teams formalize build pipelines.
