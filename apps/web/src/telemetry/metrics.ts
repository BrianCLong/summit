import { recordAudit } from './audit';
import React from 'react';

export type GoldenPathStep =
  | 'signup'
  | 'tenant_created'
  | 'first_ingest'
  | 'first_export'
  | 'investigation_created'
  | 'entities_viewed'
  | 'relationships_explored'
  | 'copilot_query'
  | 'results_viewed'
  | 'data_source_connected'
  | 'first_query_executed'
  | 'dashboard_viewed';

/**
 * First-Run Completion Funnel Milestones
 * Tracks the critical path from fresh install to meaningful signal
 */
export type FunnelMilestone =
  | 'signup_complete'
  | 'data_source_connected'
  | 'data_ingested'
  | 'entities_explored'
  | 'relationships_analyzed';

export interface FunnelMilestoneData {
  milestone: FunnelMilestone;
  route?: string;
  requiredInputs?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Tracks completion of a first-run funnel milestone
 */
export const trackFunnelMilestone = async (
  data: FunnelMilestoneData,
  status: 'success' | 'failure' = 'success'
) => {
  try {
    // Log locally for debug/audit
    recordAudit('funnel_milestone', { ...data, status });

    // Mark milestone as completed in localStorage for UI state
    if (status === 'success') {
      const progress = JSON.parse(localStorage.getItem('funnel_progress') || '{}');
      progress[data.milestone] = {
        completed: true,
        timestamp: new Date().toISOString(),
        route: data.route || window.location.pathname,
      };
      localStorage.setItem('funnel_progress', JSON.stringify(progress));

      // Dispatch custom event for same-tab updates
      window.dispatchEvent(new Event('funnel_updated'));
    }

    // Send to backend telemetry endpoint
    await fetch('/api/monitoring/telemetry/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-correlation-id': getSessionId(),
      },
      body: JSON.stringify({
        event: 'funnel_milestone',
        labels: { milestone: data.milestone, status },
        context: {
          sessionId: getSessionId(),
          deviceId: getDeviceId(),
          url: window.location.href,
          route: data.route,
        },
        metadata: data.metadata,
      }),
    });
  } catch (error) {
    console.error('Failed to track funnel milestone:', error);
  }
};

/**
 * Gets the current funnel progress state
 */
export const getFunnelProgress = (): Record<string, { completed: boolean; timestamp: string; route: string }> => {
  try {
    return JSON.parse(localStorage.getItem('funnel_progress') || '{}');
  } catch {
    return {};
  }
};

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// Generate or retrieve session correlation ID
const getSessionId = () => {
    let sid = sessionStorage.getItem('summit_session_id');
    if (!sid) {
        sid = crypto.randomUUID();
        sessionStorage.setItem('summit_session_id', sid);
    }
    return sid;
};

// Generate or retrieve device ID
const getDeviceId = () => {
    let did = localStorage.getItem('summit_device_id');
    if (!did) {
        did = crypto.randomUUID();
        localStorage.setItem('summit_device_id', did);
    }
    return did;
};

/**
 * Tracks a step in the Golden Path user journey.
 * Sends a telemetry event to the backend.
 */
export const trackGoldenPathStep = async (
  step: GoldenPathStep,
  status: 'success' | 'failure' = 'success'
) => {
  try {
    // Log locally for debug/audit
    recordAudit('golden_path_step', { step, status });

    // Send to backend telemetry endpoint
    await fetch('/api/monitoring/telemetry/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-correlation-id': getSessionId(), // Use session ID as correlation ID for events
      },
      body: JSON.stringify({
        event: 'golden_path_step',
        labels: { step, status },
        context: {
            sessionId: getSessionId(),
            deviceId: getDeviceId(),
            url: window.location.href
        }
      }),
    });
  } catch (error) {
    console.error('Failed to track golden path step:', error);
  }
};

/**
 * Reports an error to the backend telemetry service.
 */
export const reportError = async (
  error: Error,
  errorInfo?: React.ErrorInfo,
  severity: ErrorSeverity = 'high'
) => {
  try {
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      severity,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };

    // Log to console in dev
    if (import.meta.env.DEV) {
      console.group('🚨 Error Reported');
      console.error(error);
      console.info('Context:', errorInfo);
      console.groupEnd();
    }

    // Send to backend
    await fetch('/api/monitoring/telemetry/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-correlation-id': getSessionId(),
      },
      body: JSON.stringify({
        event: 'client_error',
        labels: {
          type: error.name,
          severity,
        },
        payload: errorData,
        context: {
            sessionId: getSessionId(),
            deviceId: getDeviceId(),
        }
      }),
    });
  } catch (trackingError) {
    // Fallback to console if reporting fails
    console.error('Failed to report error:', trackingError);
  }
};

export const getTelemetryContext = () => ({
    sessionId: getSessionId(),
    deviceId: getDeviceId(),
});


// Tri-pane Telemetry
export const trackTimeWindowChange = async (
    startMs: number,
    endMs: number,
    granularity: string,
    tzMode: string,
    source: string
) => {
    // Implementation for sending triPane.timeWindow.change
    // console.log('triPane.timeWindow.change', { startMs, endMs, granularity, tzMode, source });
};

export const trackSyncDivergence = async (
    deltaStartMs: number,
    deltaEndMs: number,
    pane: string,
    granularity: string
) => {
    // Implementation for sending triPane.sync.divergence_detected
    // console.log('triPane.sync.divergence_detected', { deltaStartMs, deltaEndMs, pane, granularity });
};

export const trackQueryLatency = async (
    pane: string,
    durationMs: number
) => {
    // Implementation for sending triPane.query.latency_ms
    // console.log('triPane.query.latency_ms', { pane, durationMs });
};
