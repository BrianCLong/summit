import { Trace, Metrics } from '../sdk/agent-adapter';

/**
 * Utility function to convert external framework trace events to Summit Trace artifact.
 */
export function convertToSummitTrace(adapterId: string, events: any[]): Trace {
  return {
    id: `${adapterId}-${Date.now()}`,
    timestamp: Date.now(),
    events: [...events]
  };
}

/**
 * Utility function to convert external framework metrics to Summit Metrics artifact.
 */
export function convertToSummitMetrics(metricsData: Partial<Metrics>): Metrics {
  return {
    invocations: metricsData.invocations ?? 0,
    tokens: metricsData.tokens ?? 0,
    latencyMs: metricsData.latencyMs ?? 0
  };
}
