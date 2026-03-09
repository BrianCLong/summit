export interface Trace {
  id: string;
  timestamp: number;
  events: any[];
}

export interface Metrics {
  invocations: number;
  tokens: number;
  latencyMs: number;
}

export interface SummitAgentAdapter {
  emitTrace(): Promise<Trace>
  emitMetrics(): Promise<Metrics>
}
