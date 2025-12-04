import { recordAudit } from './audit';
import React from 'react';

export type GoldenPathStep =
  | 'investigation_created'
  | 'entities_viewed'
  | 'relationships_explored'
  | 'copilot_query'
  | 'results_viewed';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

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
      },
      body: JSON.stringify({
        event: 'golden_path_step',
        labels: { step, status },
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
      },
      body: JSON.stringify({
        event: 'client_error',
        labels: {
          type: error.name,
          severity,
        },
        payload: errorData,
      }),
    });
  } catch (trackingError) {
    // Fallback to console if reporting fails
    console.error('Failed to report error:', trackingError);
  }
};
