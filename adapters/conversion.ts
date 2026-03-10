import { Trace, Metrics } from '../sdk/agent-adapter';

export function convertToTrace(id: string, events: any[]): Trace {
  return {
    id,
    timestamp: Date.now(),
    events: [...events]
  };
}

export function convertToMetrics(invocations: number, tokens: number, latencyMs: number): Metrics {
  return {
    invocations,
    tokens,
    latencyMs
  };
}
