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
  | 'results_viewed';

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
