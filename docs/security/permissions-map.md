# Permissions Map

This document captures the shared permissions vocabulary and how it is enforced across the platform. The goal is to make the RBAC model explicit, consistent, and consumable by both backend middleware and frontend capability checks.

## Roles and capabilities

| Role              | Description                                                     | Key permissions                                                                               |
| ----------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `admin`           | Full administrative control over IntelGraph and Maestro.        | `*` (all), `manage_users`, `manage_settings`, `run_maestro`, `write_graph`, `view_dashboards` |
| `analyst`         | Day-to-day IntelGraph analyst with graph authoring rights.      | `read_graph`, `write_graph`, `view_dashboards`                                                |
| `operator`        | Operations staff running Maestro workflows and service toggles. | `run_maestro`, `read_graph`, `view_dashboards`, `manage_settings`                             |
| `service_account` | Non-interactive automation account used by pipelines.           | `read_graph`, `write_graph` (scoped)                                                          |
| `viewer`          | Read-only visibility into graph data and dashboards.            | `read_graph`, `view_dashboards`                                                               |

### Permission glossary

- `read_graph`: Read-only access to graph data and visualization exports.
- `write_graph`: Create/update/delete IntelGraph entities and relationships.
- `run_maestro`: Create, update, retry, or cancel Maestro runs and pipelines.
- `view_dashboards`: Access operational dashboards and run summaries.
- `manage_users`: Administrative controls (user management, audits, overrides).
- `manage_settings`: Configuration toggles and policy overrides.

Legacy route-level permissions such as `entity:create`, `run:update`, or `admin:access` are aliased to the canonical permissions above to keep existing handlers working while we consolidate on the shared vocabulary.

## Enforcement map

| Endpoint / Area                                                       | Required permission | Notes                                                               |
| --------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------- |
| IntelGraph entity mutations (`POST/PATCH/DELETE /api/entities`)       | `write_graph`       | Enforced via `authorize('write_graph')` middleware.                 |
| Maestro run lifecycle (`/api/maestro/runs` create/read/update/delete) | `run_maestro`       | Applied uniformly to creation, updates, retries, and cancellations. |
| Admin controls (`/api/admin/*`, `/api/admin/config`, overrides)       | `manage_users`      | Protects sensitive configuration and override administration.       |

## Backend guard

Use the shared Express middleware:

```ts
import { authorize } from "../middleware/authorization";

router.post("/entities", authorize("write_graph"), handler);
router.post("/maestro/runs", authorize("run_maestro"), handler);
router.use("/admin", authorize("manage_users"));
```

## Frontend capability checks

The frontend mirrors the same permission map via `client/src/utils/capabilities.ts` and hides or disables UI affordances when the signed-in user lacks the required capability (e.g., Maestro command palette entries or admin override actions).
