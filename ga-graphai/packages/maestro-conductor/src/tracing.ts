import type { ExecutionTrace, TraceEntry, TraceStatus } from './types';

export class ExecutionTracer {
  private readonly traces = new Map<string, ExecutionTrace>();

  start(taskId: string, intent: string): ExecutionTrace {
    const trace: ExecutionTrace = {
      taskId,
      intent,
      status: 'running',
      entries: [],
      startedAt: new Date(),
    };
    this.traces.set(taskId, trace);
    return trace;
  }

  record(taskId: string, entry: TraceEntry): void {
    const trace = this.traces.get(taskId);
    if (!trace) {
      return;
    }
    trace.entries.push({ ...entry, timestamp: entry.timestamp ?? new Date() });
  }

  complete(taskId: string, status: TraceStatus, metadata?: Record<string, unknown>): void {
    const trace = this.traces.get(taskId);
    if (!trace) {
      return;
    }
    trace.status = status;
    trace.completedAt = new Date();
    trace.metadata = { ...(trace.metadata ?? {}), ...(metadata ?? {}) };
  }

  get(taskId: string): ExecutionTrace | undefined {
    return this.traces.get(taskId);
  }

  list(): ExecutionTrace[] {
    return [...this.traces.values()];
  }
}
