# Summit Telemetry & Event Catalog

> **Status:** Live as of 2026-03-09. All events below are emitted by
> `apps/web/src/telemetry/events.ts` and routed to
> `/api/monitoring/telemetry/events`.

---

## Conventions

| Field | Rule |
|---|---|
| `event` | `snake_case`, noun-verb or noun_state pattern |
| `labels` | Dimensions for grouping/filtering; max 8 per event; no PII |
| `payload` | Optional structured data; not indexed; used for debugging |
| `context.sessionId` | Per-session UUID (sessionStorage) |
| `context.deviceId` | Per-device UUID (localStorage) |
| Latency | Reported as `latency_bucket` string to bound cardinality |
| Failure | Always carries `error_type` = `Error.name` (e.g. `TypeError`) |

---

## App Lifecycle

### `app_opened`

Emitted once per session when the React root mounts and the shell is visible.

| Label | Type | Values / Notes |
|---|---|---|
| `latency_bucket` | string | `<100ms \| 100-500ms \| 500ms-2s \| 2s-5s \| >5s` |

**First-week health indicator:** count per hour; expect >95 % to be `<100ms` or `100-500ms`.

---

### `app_boot_failed`

Emitted when the React root fails to mount. Triggers immediate alerting.

| Label | Type | Values / Notes |
|---|---|---|
| `error_type` | string | `Error.name` |
| `message` | string | Truncated to 200 chars |

**Alert threshold:** any occurrence → page on-call.

---

## Navigation

### `route_loaded`

Emitted each time a route change completes (lazy chunk resolved + Suspense boundary cleared).

| Label | Type | Values / Notes |
|---|---|---|
| `route` | string | Pathname, e.g. `/explore` |
| `latency_bucket` | string | See latency buckets above |

**First-week indicator:** `>5s` routes above 5 % of traffic → investigate.

---

## Analyst Workspace

### `analyst_workspace_opened`

Emitted when the tri-pane shell becomes interactive (all three panes mounted).

| Label | Type | Values / Notes |
|---|---|---|
| `latency_bucket` | string | Time from route navigation to workspace ready |

---

### `entity_selected`

Emitted each time an entity is added to the active selection in the workspace store.

| Label | Type | Values / Notes |
|---|---|---|
| `entity_type` | string | Domain type: `Person \| Location \| Event \| Organization \| unknown` |
| `selection_count` | number | Total selected after this action |
| `outcome` | string | `success \| error` |

---

### `relation_selected`

Emitted when a graph link/edge is selected.

| Label | Type | Values / Notes |
|---|---|---|
| `relation_type` | string | e.g. `visited \| performed \| knows` |

---

### `detail_panel_opened`

Emitted when the detail panel for an entity opens.

| Label | Type | Values / Notes |
|---|---|---|
| `entity_type` | string | Domain type |

---

## Timeline / Reports

### `timeline_item_opened`

Emitted when a user opens a timeline event for detail.

| Label | Type | Values / Notes |
|---|---|---|
| `item_type` | string | Domain type of the timeline item |

---

### `report_preview_opened`

Emitted when a report preview is triggered.

| Label | Type | Values / Notes |
|---|---|---|
| `report_type` | string | Report category/template |

---

## Tri-Pane Synchronization

### `tri_pane_time_window_changed`

Emitted when the shared time window changes.

| Label | Type | Values / Notes |
|---|---|---|
| `range_ms` | number | Duration of the selected window in ms |
| `granularity` | string | e.g. `hour \| day \| week` |
| `tz_mode` | string | `local \| utc` |
| `source` | string | Which pane initiated: `timeline \| map \| graph \| toolbar` |

---

### `tri_pane_sync_divergence`

Emitted when a pane's time window diverges from the shared state. Indicates desync bugs.

| Label | Type | Values / Notes |
|---|---|---|
| `delta_start_ms` | number | Divergence at window start |
| `delta_end_ms` | number | Divergence at window end |
| `pane` | string | `map \| graph \| timeline` |
| `granularity` | string | Active granularity |

**Alert threshold:** any occurrence sustained >5 min → investigate pane sync logic.

---

### `tri_pane_query_latency`

Emitted per pane data query.

| Label | Type | Values / Notes |
|---|---|---|
| `pane` | string | `map \| graph \| timeline` |
| `latency_bucket` | string | See latency buckets |
| `duration_ms` | number | Actual measured ms (in payload for debugging) |

---

## i18n

### `language_changed`

Emitted when the user switches language.

| Label | Type | Values / Notes |
|---|---|---|
| `from_locale` | string | BCP 47 locale code |
| `to_locale` | string | BCP 47 locale code |

---

### `i18n_fallback_triggered`

Emitted when a translation key is missing and the fallback locale is used.

| Label | Type | Values / Notes |
|---|---|---|
| `locale` | string | The locale that had no translation |
| `key` | string | The translation key (truncated to 100 chars) |

**Alert threshold:** >1 % of sessions with fallbacks → missing translation bundle.

---

## Plugins & Sandbox

### `plugin_loaded`

Emitted when a plugin initializes successfully.

| Label | Type | Values / Notes |
|---|---|---|
| `plugin_id` | string | Plugin identifier |
| `plugin_type` | string | Plugin category |
| `latency_bucket` | string | Load time |

---

### `plugin_load_failed`

Emitted when a plugin fails to load.

| Label | Type | Values / Notes |
|---|---|---|
| `plugin_id` | string | Plugin identifier |
| `plugin_type` | string | Plugin category |
| `error_type` | string | `Error.name` |

**Alert threshold:** >10 % of plugin loads failing → disable plugin, escalate.

---

### `sandbox_init_failed`

Emitted when a sandbox container fails to initialize.

| Label | Type | Values / Notes |
|---|---|---|
| `sandbox_id` | string | Sandbox identifier |
| `error_type` | string | `Error.name` |

**Alert threshold:** any spike → investigate sandbox host health.

---

## Feature Flags

### `feature_flag_path_used`

Emitted once per session per flag+variant combination that is exercised in the UI.
Used to verify targeting works correctly after deploy.

| Label | Type | Values / Notes |
|---|---|---|
| `flag_key` | string | e.g. `maestro.newRunConsole` |
| `variant` | string | `enabled \| disabled \| control \| treatment` |
| `route` | string | Route where the flag was evaluated |

---

## Error Boundaries

### `recoverable_error_shown`

Emitted when an error boundary catches a render error but has retries remaining.
User sees a "retry" fallback UI.

| Label | Type | Values / Notes |
|---|---|---|
| `boundary_name` | string | Named boundary (see `ErrorBoundary boundaryName` prop) |
| `error_type` | string | `Error.name` |
| `route` | string | Current pathname |

---

### `fatal_error_boundary_triggered`

Emitted when an error boundary catches a render error with no remaining retries.
User sees a hard failure state. Triggers alerting.

| Label | Type | Values / Notes |
|---|---|---|
| `boundary_name` | string | Named boundary |
| `error_type` | string | `Error.name` |
| `route` | string | Current pathname |
| `fingerprint` | string | 8-hex FNV-1a error fingerprint for deduplication |

**Alert threshold:** >5 occurrences / 5 min on any single boundary → page on-call.

---

## Golden Path (pre-existing)

### `golden_path_step`

Emitted by `trackGoldenPathStep()` in `telemetry/metrics.ts` for structured onboarding steps.

| Label | Type | Values / Notes |
|---|---|---|
| `step` | string | `signup \| tenant_created \| first_ingest \| first_export \| investigation_created \| entities_viewed \| relationships_explored \| copilot_query \| results_viewed` |
| `status` | string | `success \| failure` |

---

## Export Events (pre-existing)

Events emitted by `telemetry/export.ts`:

| Event | When emitted |
|---|---|
| `export_started` | Export job begins |
| `export_completed` | Export job finishes successfully |
| `export_failed` | Export job fails |

Labels: `jobId`. Payload: `durationMs`.

---

## Client Errors (pre-existing)

### `client_error`

Emitted by `reportError()` in `telemetry/metrics.ts` for arbitrary caught errors.

| Label | Type | Notes |
|---|---|---|
| `type` | string | `Error.name` |
| `severity` | string | `low \| medium \| high \| critical` |
| `category` | string | `render \| network \| data_fetch \| mutation \| auth \| validation \| unknown` |
| `fingerprint` | string | 8-hex FNV-1a |

---

## First-Week Health Dashboard Queries

Use these event names to build your monitoring queries:

```
# App start success rate
count(event="app_opened") / (count(event="app_opened") + count(event="app_boot_failed"))

# Fatal boundary rate
count(event="fatal_error_boundary_triggered") grouped by boundary_name, route

# Entity selection success
count(event="entity_selected", outcome="success") / count(event="entity_selected")

# Plugin load failure rate
count(event="plugin_load_failed") / (count(event="plugin_loaded") + count(event="plugin_load_failed"))

# Slow workspace opens (>5s)
count(event="analyst_workspace_opened", latency_bucket=">5s") / count(event="analyst_workspace_opened")

# Tri-pane desync events
count(event="tri_pane_sync_divergence") grouped by pane

# i18n fallback rate
count(event="i18n_fallback_triggered") grouped by locale
```
