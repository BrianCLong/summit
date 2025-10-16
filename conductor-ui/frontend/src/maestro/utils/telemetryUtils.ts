import React from 'react';

// OpenTelemetry trace and span types
export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  traceFlags: number;
  traceState?: string;
  baggage?: Record<string, string>;
}

export interface SpanData {
  spanId: string;
  traceId: string;
  parentSpanId?: string;
  name: string;
  kind: SpanKind;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: SpanStatus;
  attributes: Record<string, unknown>;
  events: SpanEvent[];
  links: SpanLink[];
  resource: Resource;
  instrumentationScope: InstrumentationScope;
}

export enum SpanKind {
  INTERNAL = 1,
  SERVER = 2,
  CLIENT = 3,
  PRODUCER = 4,
  CONSUMER = 5,
}

export enum SpanStatus {
  UNSET = 0,
  OK = 1,
  ERROR = 2,
}

export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: Record<string, unknown>;
}

export interface SpanLink {
  traceId: string;
  spanId: string;
  attributes?: Record<string, unknown>;
  traceState?: string;
}

export interface Resource {
  attributes: Record<string, unknown>;
}

export interface InstrumentationScope {
  name: string;
  version?: string;
  schemaUrl?: string;
  attributes?: Record<string, unknown>;
}

// Trace visualization types
export interface TraceNode {
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  duration: number;
  status: SpanStatus;
  level: number;
  children: TraceNode[];
  attributes: Record<string, unknown>;
  events: SpanEvent[];
}

export interface TraceViewState {
  selectedSpanId?: string;
  expandedSpanIds: Set<string>;
  timeRange?: {
    start: number;
    end: number;
  };
  filters: {
    services?: string[];
    operations?: string[];
    statusFilter?: 'all' | 'ok' | 'error';
    minDuration?: number;
  };
}

export class TelemetryManager {
  private traceContext: TraceContext | null = null;
  private spans = new Map<string, SpanData>();
  private activeSpans = new Set<string>();
  private endpoint: string;
  private headers: Record<string, string>;

  constructor(
    options: {
      endpoint?: string;
      apiKey?: string;
      serviceName?: string;
      serviceVersion?: string;
    } = {},
  ) {
    this.endpoint = options.endpoint || '/api/maestro/v1/telemetry';
    this.headers = {
      'Content-Type': 'application/json',
      ...(options.apiKey && { 'X-API-Key': options.apiKey }),
    };
  }

  // Trace context management
  setTraceContext(context: TraceContext): void {
    this.traceContext = context;
  }

  getTraceContext(): TraceContext | null {
    return this.traceContext;
  }

  generateTraceId(): string {
    return this.generateRandomId(32);
  }

  generateSpanId(): string {
    return this.generateRandomId(16);
  }

  private generateRandomId(length: number): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }

  // Span lifecycle management
  startSpan(
    name: string,
    options: {
      kind?: SpanKind;
      parentSpanId?: string;
      attributes?: Record<string, unknown>;
      links?: SpanLink[];
    } = {},
  ): string {
    const spanId = this.generateSpanId();
    const traceId = this.traceContext?.traceId || this.generateTraceId();
    const startTime = Date.now();

    const span: SpanData = {
      spanId,
      traceId,
      parentSpanId: options.parentSpanId || this.traceContext?.spanId,
      name,
      kind: options.kind || SpanKind.INTERNAL,
      startTime,
      status: SpanStatus.UNSET,
      attributes: {
        'maestro.run.id': this.extractRunId(),
        'maestro.node.id': this.extractNodeId(),
        'maestro.component': this.extractComponent(),
        'user.id': this.extractUserId(),
        'tenant.id': this.extractTenantId(),
        ...options.attributes,
      },
      events: [],
      links: options.links || [],
      resource: {
        attributes: {
          'service.name': 'maestro-ui',
          'service.version': process.env.VITE_APP_VERSION || '1.0.0',
          'service.instance.id': this.generateInstanceId(),
          'deployment.environment': process.env.NODE_ENV || 'development',
        },
      },
      instrumentationScope: {
        name: '@maestro/telemetry',
        version: '1.0.0',
      },
    };

    this.spans.set(spanId, span);
    this.activeSpans.add(spanId);

    // Update trace context
    this.setTraceContext({
      traceId,
      spanId,
      parentSpanId: span.parentSpanId,
      traceFlags: 1, // Sampled
      baggage: this.traceContext?.baggage,
    });

    return spanId;
  }

  finishSpan(
    spanId: string,
    options: {
      status?: SpanStatus;
      statusMessage?: string;
      attributes?: Record<string, unknown>;
    } = {},
  ): void {
    const span = this.spans.get(spanId);
    if (!span) {
      console.warn(`Span ${spanId} not found`);
      return;
    }

    const endTime = Date.now();
    span.endTime = endTime;
    span.duration = endTime - span.startTime;
    span.status = options.status || SpanStatus.OK;

    if (options.attributes) {
      Object.assign(span.attributes, options.attributes);
    }

    if (options.statusMessage) {
      span.attributes['otel.status_description'] = options.statusMessage;
    }

    this.activeSpans.delete(spanId);

    // Send span to backend
    this.exportSpan(span);
  }

  addSpanEvent(
    spanId: string,
    name: string,
    attributes?: Record<string, unknown>,
  ): void {
    const span = this.spans.get(spanId);
    if (!span) {
      console.warn(`Span ${spanId} not found`);
      return;
    }

    span.events.push({
      name,
      timestamp: Date.now(),
      attributes,
    });
  }

  setSpanAttribute(spanId: string, key: string, value: unknown): void {
    const span = this.spans.get(spanId);
    if (!span) {
      console.warn(`Span ${spanId} not found`);
      return;
    }

    span.attributes[key] = value;
  }

  recordException(spanId: string, exception: Error): void {
    const span = this.spans.get(spanId);
    if (!span) {
      console.warn(`Span ${spanId} not found`);
      return;
    }

    span.status = SpanStatus.ERROR;
    span.attributes['error'] = true;
    span.attributes['error.type'] = exception.name;
    span.attributes['error.message'] = exception.message;

    if (exception.stack) {
      span.attributes['error.stack'] = exception.stack;
    }

    this.addSpanEvent(spanId, 'exception', {
      'exception.type': exception.name,
      'exception.message': exception.message,
      'exception.stacktrace': exception.stack,
    });
  }

  // Trace retrieval and processing
  async getTrace(traceId: string): Promise<SpanData[]> {
    try {
      const response = await fetch(`${this.endpoint}/traces/${traceId}`, {
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch trace: ${response.statusText}`);
      }

      const traceData = await response.json();
      return traceData.spans || [];
    } catch (error) {
      console.error('Failed to fetch trace:', error);
      return [];
    }
  }

  async searchTraces(query: {
    timeRange: { start: number; end: number };
    services?: string[];
    operations?: string[];
    tags?: Record<string, string>;
    minDuration?: number;
    maxDuration?: number;
    limit?: number;
  }): Promise<{ traceId: string; spans: SpanData[]; summary: object }[]> {
    try {
      const response = await fetch(`${this.endpoint}/traces/search`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(query),
      });

      if (!response.ok) {
        throw new Error(`Failed to search traces: ${response.statusText}`);
      }

      const searchResults = await response.json();
      return searchResults.traces || [];
    } catch (error) {
      console.error('Failed to search traces:', error);
      return [];
    }
  }

  // Trace processing utilities
  buildTraceTree(spans: SpanData[]): TraceNode[] {
    const rootSpans: SpanData[] = [];

    // Build span map and identify root spans
    spans.forEach((span) => {
      if (!span.parentSpanId) {
        rootSpans.push(span);
      }
    });

    // Build tree structure
    const buildNode = (span: SpanData, level = 0): TraceNode => {
      const children = spans
        .filter((s) => s.parentSpanId === span.spanId)
        .sort((a, b) => a.startTime - b.startTime)
        .map((child) => buildNode(child, level + 1));

      return {
        spanId: span.spanId,
        parentSpanId: span.parentSpanId,
        name: span.name,
        startTime: span.startTime,
        duration: span.duration || 0,
        status: span.status,
        level,
        children,
        attributes: span.attributes,
        events: span.events,
      };
    };

    return rootSpans
      .sort((a, b) => a.startTime - b.startTime)
      .map((span) => buildNode(span));
  }

  calculateTraceMetrics(spans: SpanData[]): {
    totalDuration: number;
    spanCount: number;
    errorCount: number;
    serviceCount: number;
    criticalPath: SpanData[];
    services: string[];
  } {
    if (spans.length === 0) {
      return {
        totalDuration: 0,
        spanCount: 0,
        errorCount: 0,
        serviceCount: 0,
        criticalPath: [],
        services: [],
      };
    }

    const sortedSpans = spans.sort((a, b) => a.startTime - b.startTime);
    const firstSpan = sortedSpans[0];
    const lastSpan = sortedSpans.reduce((latest, span) =>
      (span.endTime || span.startTime) > (latest.endTime || latest.startTime)
        ? span
        : latest,
    );

    const totalDuration =
      (lastSpan.endTime || lastSpan.startTime) - firstSpan.startTime;
    const errorCount = spans.filter(
      (s) => s.status === SpanStatus.ERROR,
    ).length;
    const services = [
      ...new Set(
        spans
          .map((s) => s.resource.attributes['service.name'])
          .filter(Boolean) as string[],
      ),
    ];

    // Calculate critical path (longest path through the trace)
    const criticalPath = this.findCriticalPath(spans);

    return {
      totalDuration,
      spanCount: spans.length,
      errorCount,
      serviceCount: services.length,
      criticalPath,
      services,
    };
  }

  private findCriticalPath(spans: SpanData[]): SpanData[] {
    // Simplified critical path calculation
    // In practice, this would use more sophisticated algorithms
    const rootSpans = spans.filter((s) => !s.parentSpanId);

    let longestPath: SpanData[] = [];
    let maxDuration = 0;

    const findPath = (span: SpanData, currentPath: SpanData[]): void => {
      const newPath = [...currentPath, span];
      const children = spans.filter((s) => s.parentSpanId === span.spanId);

      if (children.length === 0) {
        // Leaf node - calculate total duration
        const pathDuration = newPath.reduce(
          (sum, s) => sum + (s.duration || 0),
          0,
        );
        if (pathDuration > maxDuration) {
          maxDuration = pathDuration;
          longestPath = newPath;
        }
      } else {
        children.forEach((child) => findPath(child, newPath));
      }
    };

    rootSpans.forEach((root) => findPath(root, []));
    return longestPath;
  }

  // Export utilities
  private async exportSpan(span: SpanData): Promise<void> {
    try {
      await fetch(`${this.endpoint}/spans`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          resourceSpans: [
            {
              resource: span.resource,
              scopeSpans: [
                {
                  scope: span.instrumentationScope,
                  spans: [span],
                },
              ],
            },
          ],
        }),
      });
    } catch (error) {
      console.error('Failed to export span:', error);
    }
  }

  // Context extraction helpers
  private extractRunId(): string | undefined {
    return window.location.pathname.match(/\/runs\/([^/]+)/)?.[1];
  }

  private extractNodeId(): string | undefined {
    const params = new URLSearchParams(window.location.search);
    return params.get('nodeId') || undefined;
  }

  private extractComponent(): string {
    if (window.location.pathname.includes('/maestro')) {
      return 'maestro-ui';
    }
    return 'frontend';
  }

  private extractUserId(): string | undefined {
    // Would typically extract from authentication context
    return 'demo-user';
  }

  private extractTenantId(): string | undefined {
    const params = new URLSearchParams(window.location.search);
    return params.get('tenant') || 'default';
  }

  private generateInstanceId(): string {
    return `frontend-${Math.random().toString(36).substring(7)}`;
  }
}

// Global telemetry instance
export const telemetry = new TelemetryManager();

// React hook for telemetry
export const useTelemetry = () => {
  const [activeSpans, setActiveSpans] = React.useState<Set<string>>(new Set());

  const startSpan = React.useCallback((name: string, options?: object) => {
    const spanId = telemetry.startSpan(name, options);
    setActiveSpans((prev) => new Set(prev).add(spanId));
    return spanId;
  }, []);

  const finishSpan = React.useCallback((spanId: string, options?: object) => {
    telemetry.finishSpan(spanId, options);
    setActiveSpans((prev) => {
      const next = new Set(prev);
      next.delete(spanId);
      return next;
    });
  }, []);

  const recordEvent = React.useCallback(
    (spanId: string, name: string, attributes?: object) => {
      telemetry.addSpanEvent(spanId, name, attributes);
    },
    [],
  );

  const recordError = React.useCallback((spanId: string, error: Error) => {
    telemetry.recordException(spanId, error);
  }, []);

  const setAttribute = React.useCallback(
    (spanId: string, key: string, value: unknown) => {
      telemetry.setSpanAttribute(spanId, key, value);
    },
    [],
  );

  return {
    activeSpans: Array.from(activeSpans),
    startSpan,
    finishSpan,
    recordEvent,
    recordError,
    setAttribute,
    getTrace: telemetry.getTrace.bind(telemetry),
    searchTraces: telemetry.searchTraces.bind(telemetry),
  };
};

// Decorator for automatic span creation
export function traced(name?: string) {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const spanName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: unknown[]) {
      const spanId = telemetry.startSpan(spanName, {
        kind: SpanKind.INTERNAL,
        attributes: {
          'code.function': propertyKey,
          'code.namespace': target.constructor.name,
        },
      });

      try {
        const result = await originalMethod.apply(this, args);
        telemetry.finishSpan(spanId, { status: SpanStatus.OK });
        return result;
      } catch (error) {
        telemetry.recordException(spanId, error as Error);
        telemetry.finishSpan(spanId, { status: SpanStatus.ERROR });
        throw error;
      }
    };

    return descriptor;
  };
}

// Performance monitoring utilities
export const measurePerformance = (
  name: string,
  fn: () => Promise<unknown> | unknown,
) => {
  const spanId = telemetry.startSpan(`performance.${name}`, {
    kind: SpanKind.INTERNAL,
    attributes: { 'performance.measure': true },
  });

  const startTime = performance.now();

  try {
    const result = fn();

    if (result instanceof Promise) {
      return result
        .then((res) => {
          const duration = performance.now() - startTime;
          telemetry.setSpanAttribute(spanId, 'performance.duration', duration);
          telemetry.finishSpan(spanId, { status: SpanStatus.OK });
          return res;
        })
        .catch((error) => {
          telemetry.recordException(spanId, error);
          telemetry.finishSpan(spanId, { status: SpanStatus.ERROR });
          throw error;
        });
    } else {
      const duration = performance.now() - startTime;
      telemetry.setSpanAttribute(spanId, 'performance.duration', duration);
      telemetry.finishSpan(spanId, { status: SpanStatus.OK });
      return result;
    }
  } catch (error) {
    telemetry.recordException(spanId, error as Error);
    telemetry.finishSpan(spanId, { status: SpanStatus.ERROR });
    throw error;
  }
};
