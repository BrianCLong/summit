import { randomUUID } from 'node:crypto';
import type { Trace, TraceEvent, TraceEventType } from '../types.js';

/**
 * TraceBuilder - Fluent API for constructing evaluation traces
 *
 * Captures structured traces for every request + tool call + routing decision
 * with latency, token usage, cost, and safety annotations.
 */
export class TraceBuilder {
  private readonly traceId: string;
  private readonly scenarioId: string;
  private readonly runId: string;
  private readonly startTime: Date;
  private endTime?: Date;
  private readonly events: TraceEvent[] = [];
  private readonly eventStack: string[] = [];
  private metadata: Record<string, unknown> = {};

  constructor(scenarioId: string, runId: string) {
    this.traceId = randomUUID();
    this.scenarioId = scenarioId;
    this.runId = runId;
    this.startTime = new Date();
  }

  /**
   * Start a new span/event
   */
  startEvent(
    type: TraceEventType,
    name: string,
    attributes?: Record<string, unknown>,
  ): string {
    const eventId = randomUUID();
    const parentId =
      this.eventStack.length > 0
        ? this.eventStack[this.eventStack.length - 1]
        : undefined;

    const event: TraceEvent = {
      id: eventId,
      traceId: this.traceId,
      parentId,
      timestamp: new Date().toISOString(),
      type,
      name,
      attributes,
      status: 'pending',
    };

    this.events.push(event);
    this.eventStack.push(eventId);
    return eventId;
  }

  /**
   * End the current span/event with metrics
   */
  endEvent(
    eventId: string,
    status: 'success' | 'failure',
    metrics?: TraceEvent['metrics'],
    error?: TraceEvent['error'],
  ): void {
    const event = this.events.find((e) => e.id === eventId);
    if (!event) {
      throw new Error(`Event ${eventId} not found`);
    }

    event.status = status;
    event.metrics = metrics;
    if (error) {
      event.error = error;
    }

    // Pop from stack
    const stackIdx = this.eventStack.indexOf(eventId);
    if (stackIdx >= 0) {
      this.eventStack.splice(stackIdx, 1);
    }
  }

  /**
   * Record a routing decision
   */
  recordRoutingDecision(
    selectedTool: string,
    score: number,
    reasoning: string[],
    alternatives: Array<{ toolId: string; score: number }>,
  ): void {
    this.startEvent('routing_decision', `route:${selectedTool}`, {
      selectedTool,
      score,
      reasoning,
      alternatives,
    });
    // Routing decisions are instantaneous
    this.endEvent(this.eventStack[this.eventStack.length - 1], 'success');
  }

  /**
   * Record a safety check
   */
  recordSafetyCheck(
    checkType: string,
    passed: boolean,
    severity: string,
    details: string,
  ): void {
    const eventId = this.startEvent('safety_check', `safety:${checkType}`, {
      checkType,
      passed,
      severity,
      details,
    });
    this.endEvent(eventId, passed ? 'success' : 'failure');
  }

  /**
   * Record an error
   */
  recordError(code: string, message: string, stack?: string): void {
    const eventId = this.startEvent('error', `error:${code}`, {
      code,
      message,
    });
    this.endEvent(eventId, 'failure', undefined, { code, message, stack });
  }

  /**
   * Add metadata to the trace
   */
  addMetadata(key: string, value: unknown): void {
    this.metadata[key] = value;
  }

  /**
   * Finalize and build the trace
   */
  build(): Trace {
    this.endTime = new Date();

    // Calculate summary
    const totalDurationMs =
      this.endTime.getTime() - this.startTime.getTime();
    let totalTokens = 0;
    let totalCostUsd = 0;
    let toolCallCount = 0;
    let errorCount = 0;
    let safetyViolations = 0;

    for (const event of this.events) {
      if (event.metrics) {
        totalTokens += event.metrics.totalTokens ?? 0;
        totalCostUsd += event.metrics.costUsd ?? 0;
      }
      if (
        event.type === 'tool_call_start' ||
        event.type === 'tool_call_end'
      ) {
        toolCallCount += 0.5; // Count pairs
      }
      if (event.status === 'failure') {
        errorCount++;
      }
      if (
        event.type === 'safety_check' &&
        event.attributes?.passed === false
      ) {
        safetyViolations++;
      }
    }

    const success =
      errorCount === 0 &&
      safetyViolations === 0 &&
      this.events.some(
        (e) => e.type === 'request_end' && e.status === 'success',
      );

    return {
      id: this.traceId,
      scenarioId: this.scenarioId,
      runId: this.runId,
      startTime: this.startTime.toISOString(),
      endTime: this.endTime.toISOString(),
      events: this.events,
      summary: {
        success,
        totalDurationMs,
        totalTokens,
        totalCostUsd,
        toolCallCount: Math.floor(toolCallCount),
        errorCount,
        safetyViolations,
      },
      metadata: this.metadata,
    };
  }
}

/**
 * Parse and validate a trace from JSON
 */
export function parseTrace(json: unknown): Trace {
  // Basic validation - in production use Zod schema
  const trace = json as Trace;
  if (!trace.id || !trace.scenarioId || !trace.events) {
    throw new Error('Invalid trace format');
  }
  return trace;
}

/**
 * Merge multiple traces into a combined trace
 */
export function mergeTraces(traces: Trace[]): Trace {
  if (traces.length === 0) {
    throw new Error('Cannot merge empty trace array');
  }

  const merged: Trace = {
    id: randomUUID(),
    scenarioId: traces[0].scenarioId,
    runId: traces[0].runId,
    startTime: traces.reduce(
      (min, t) => (t.startTime < min ? t.startTime : min),
      traces[0].startTime,
    ),
    endTime: traces.reduce(
      (max, t) => (t.endTime && t.endTime > max ? t.endTime : max),
      traces[0].endTime ?? traces[0].startTime,
    ),
    events: traces.flatMap((t) => t.events),
    summary: {
      success: traces.every((t) => t.summary?.success ?? false),
      totalDurationMs: traces.reduce(
        (sum, t) => sum + (t.summary?.totalDurationMs ?? 0),
        0,
      ),
      totalTokens: traces.reduce(
        (sum, t) => sum + (t.summary?.totalTokens ?? 0),
        0,
      ),
      totalCostUsd: traces.reduce(
        (sum, t) => sum + (t.summary?.totalCostUsd ?? 0),
        0,
      ),
      toolCallCount: traces.reduce(
        (sum, t) => sum + (t.summary?.toolCallCount ?? 0),
        0,
      ),
      errorCount: traces.reduce(
        (sum, t) => sum + (t.summary?.errorCount ?? 0),
        0,
      ),
      safetyViolations: traces.reduce(
        (sum, t) => sum + (t.summary?.safetyViolations ?? 0),
        0,
      ),
    },
  };

  return merged;
}
