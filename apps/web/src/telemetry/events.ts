/**
 * Summit Adoption Telemetry — Event Catalog
 *
 * Canonical event names and helpers for first-week monitoring.
 * All events are routed to /api/monitoring/telemetry/events via the shared
 * `emit()` helper so the backend can aggregate them in one place.
 *
 * Instrumentation principles:
 *  - One event per user-visible outcome; no synthetic duplicates.
 *  - Properties limited to what is visible on-screen or from URL/config (no PII).
 *  - Failures always carry an `error_type` dimension so alerts can be specific.
 *  - Latency is recorded as a discrete `latency_bucket` string to keep cardinality low.
 */

import { recordAudit } from './audit';

// ─── Types ────────────────────────────────────────────────────────────────────

export type LatencyBucket =
  | '<100ms'
  | '100-500ms'
  | '500ms-2s'
  | '2s-5s'
  | '>5s';

export interface TelemetryContext {
  sessionId: string;
  deviceId: string;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function getSessionId(): string {
  let sid = sessionStorage.getItem('summit_session_id');
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem('summit_session_id', sid);
  }
  return sid;
}

function getDeviceId(): string {
  let did = localStorage.getItem('summit_device_id');
  if (!did) {
    did = crypto.randomUUID();
    localStorage.setItem('summit_device_id', did);
  }
  return did;
}

export function getTelemetryCtx(): TelemetryContext {
  return { sessionId: getSessionId(), deviceId: getDeviceId() };
}

function toLatencyBucket(ms: number): LatencyBucket {
  if (ms < 100) return '<100ms';
  if (ms < 500) return '100-500ms';
  if (ms < 2000) return '500ms-2s';
  if (ms < 5000) return '2s-5s';
  return '>5s';
}

async function emit(event: string, labels: Record<string, unknown>, payload?: Record<string, unknown>) {
  const ctx = getTelemetryCtx();
  const body = { event, labels, payload, context: ctx };

  recordAudit(event, labels);

  try {
    await fetch('/api/monitoring/telemetry/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-correlation-id': ctx.sessionId,
      },
      body: JSON.stringify(body),
    });
  } catch {
    // telemetry must never crash the product
  }
}

// ─── App lifecycle events ─────────────────────────────────────────────────────

/**
 * Emitted once per session when the React tree mounts successfully and the
 * shell is visible to the user. Measures first-paint readiness.
 */
export async function trackAppOpened(durationMs: number) {
  await emit('app_opened', {
    latency_bucket: toLatencyBucket(durationMs),
  });
}

/**
 * Emitted when app bootstrap fails fatally (React root never mounts, or
 * OTel init throws). Triggers immediate alerting.
 */
export async function trackAppBootFailed(errorType: string, message: string) {
  await emit('app_boot_failed', {
    error_type: errorType,
    message: message.slice(0, 200),
  });
}

// ─── Route / navigation events ────────────────────────────────────────────────

/**
 * Emitted each time a route change completes and the page is visible.
 * `latency_ms` is time from navigation start to Suspense boundary resolution.
 */
export async function trackRouteLoaded(route: string, durationMs: number) {
  await emit('route_loaded', {
    route,
    latency_bucket: toLatencyBucket(durationMs),
  });
}

// ─── Analyst workspace events ─────────────────────────────────────────────────

/**
 * Emitted when the analyst workspace (tri-pane shell) becomes interactive.
 */
export async function trackAnalystWorkspaceOpened(durationMs: number) {
  await emit('analyst_workspace_opened', {
    latency_bucket: toLatencyBucket(durationMs),
  });
}

/**
 * Emitted each time a user selects an entity in the workspace.
 * `entity_type` is the domain type (Person, Location, Event, Organization, …).
 */
export async function trackEntitySelected(
  entityType: string,
  selectionCount: number,
  outcome: 'success' | 'error' = 'success',
) {
  await emit('entity_selected', {
    entity_type: entityType,
    selection_count: selectionCount,
    outcome,
  });
}

/**
 * Emitted when a relation/link is selected in the graph pane.
 */
export async function trackRelationSelected(relationType: string) {
  await emit('relation_selected', { relation_type: relationType });
}

// ─── Timeline / report / detail events ───────────────────────────────────────

export async function trackTimelineItemOpened(itemType: string) {
  await emit('timeline_item_opened', { item_type: itemType });
}

export async function trackReportPreviewOpened(reportType: string) {
  await emit('report_preview_opened', { report_type: reportType });
}

export async function trackDetailPanelOpened(entityType: string) {
  await emit('detail_panel_opened', { entity_type: entityType });
}

// ─── i18n events ─────────────────────────────────────────────────────────────

export async function trackLanguageChanged(fromLocale: string, toLocale: string) {
  await emit('language_changed', { from_locale: fromLocale, to_locale: toLocale });
}

export async function trackI18nFallbackTriggered(locale: string, key: string) {
  await emit('i18n_fallback_triggered', {
    locale,
    key: key.slice(0, 100), // cap key length
  });
}

// ─── Tri-pane synchronization events ─────────────────────────────────────────

/**
 * Emitted when user changes the shared time window.
 * `source` identifies which pane initiated the change (timeline|map|graph|toolbar).
 */
export async function trackTimeWindowChange(
  startMs: number,
  endMs: number,
  granularity: string,
  tzMode: string,
  source: string,
) {
  await emit('tri_pane_time_window_changed', {
    range_ms: endMs - startMs,
    granularity,
    tz_mode: tzMode,
    source,
  });
}

/**
 * Emitted when pane sync diverges beyond an expected threshold.
 * Useful for detecting desync regressions during first week.
 */
export async function trackSyncDivergence(
  deltaStartMs: number,
  deltaEndMs: number,
  pane: string,
  granularity: string,
) {
  await emit('tri_pane_sync_divergence', {
    delta_start_ms: deltaStartMs,
    delta_end_ms: deltaEndMs,
    pane,
    granularity,
  });
}

/**
 * Emitted per pane query with its observed latency.
 */
export async function trackQueryLatency(pane: string, durationMs: number) {
  await emit('tri_pane_query_latency', {
    pane,
    latency_bucket: toLatencyBucket(durationMs),
    duration_ms: durationMs,
  });
}

// ─── Plugin / sandbox events ──────────────────────────────────────────────────

export async function trackPluginLoaded(pluginId: string, pluginType: string, durationMs: number) {
  await emit('plugin_loaded', {
    plugin_id: pluginId,
    plugin_type: pluginType,
    latency_bucket: toLatencyBucket(durationMs),
  });
}

export async function trackPluginLoadFailed(pluginId: string, pluginType: string, errorType: string) {
  await emit('plugin_load_failed', {
    plugin_id: pluginId,
    plugin_type: pluginType,
    error_type: errorType,
  });
}

export async function trackSandboxInitFailed(sandboxId: string, errorType: string) {
  await emit('sandbox_init_failed', {
    sandbox_id: sandboxId,
    error_type: errorType,
  });
}

// ─── Feature flag events ──────────────────────────────────────────────────────

/**
 * Emitted once per session per flag path that is exercised. Useful for
 * verifying flag targeting is working as expected after deploy.
 */
export async function trackFeatureFlagPathUsed(
  flagKey: string,
  variant: string,
  route: string,
) {
  await emit('feature_flag_path_used', {
    flag_key: flagKey,
    variant,
    route,
  });
}

// ─── Error events ─────────────────────────────────────────────────────────────

/**
 * Emitted when an error boundary triggers a recoverable fallback UI
 * (user can retry). Distinct from fatal boundary events.
 */
export async function trackRecoverableErrorShown(
  boundaryName: string,
  errorType: string,
  route: string,
) {
  await emit('recoverable_error_shown', {
    boundary_name: boundaryName,
    error_type: errorType,
    route,
  });
}

/**
 * Emitted when an error boundary catches a fatal render error with no
 * remaining retries. Triggers immediate alerting if rate spikes.
 */
export async function trackFatalErrorBoundaryTriggered(
  boundaryName: string,
  errorType: string,
  route: string,
  fingerprint: string,
) {
  await emit('fatal_error_boundary_triggered', {
    boundary_name: boundaryName,
    error_type: errorType,
    route,
    fingerprint,
  });
}
