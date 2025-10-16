import React from 'react';
export var SpanKind;
(function (SpanKind) {
  SpanKind[(SpanKind['INTERNAL'] = 1)] = 'INTERNAL';
  SpanKind[(SpanKind['SERVER'] = 2)] = 'SERVER';
  SpanKind[(SpanKind['CLIENT'] = 3)] = 'CLIENT';
  SpanKind[(SpanKind['PRODUCER'] = 4)] = 'PRODUCER';
  SpanKind[(SpanKind['CONSUMER'] = 5)] = 'CONSUMER';
})(SpanKind || (SpanKind = {}));
export var SpanStatus;
(function (SpanStatus) {
  SpanStatus[(SpanStatus['UNSET'] = 0)] = 'UNSET';
  SpanStatus[(SpanStatus['OK'] = 1)] = 'OK';
  SpanStatus[(SpanStatus['ERROR'] = 2)] = 'ERROR';
})(SpanStatus || (SpanStatus = {}));
export class TelemetryManager {
  constructor(options = {}) {
    this.traceContext = null;
    this.spans = new Map();
    this.activeSpans = new Set();
    this.endpoint = options.endpoint || '/api/maestro/v1/telemetry';
    this.headers = {
      'Content-Type': 'application/json',
      ...(options.apiKey && { 'X-API-Key': options.apiKey }),
    };
  }
  // Trace context management
  setTraceContext(context) {
    this.traceContext = context;
  }
  getTraceContext() {
    return this.traceContext;
  }
  generateTraceId() {
    return this.generateRandomId(32);
  }
  generateSpanId() {
    return this.generateRandomId(16);
  }
  generateRandomId(length) {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }
  // Span lifecycle management
  startSpan(name, options = {}) {
    const spanId = this.generateSpanId();
    const traceId = this.traceContext?.traceId || this.generateTraceId();
    const startTime = Date.now();
    const span = {
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
  finishSpan(spanId, options = {}) {
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
  addSpanEvent(spanId, name, attributes) {
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
  setSpanAttribute(spanId, key, value) {
    const span = this.spans.get(spanId);
    if (!span) {
      console.warn(`Span ${spanId} not found`);
      return;
    }
    span.attributes[key] = value;
  }
  recordException(spanId, exception) {
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
  async getTrace(traceId) {
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
  async searchTraces(query) {
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
  buildTraceTree(spans) {
    const spanMap = new Map();
    const rootSpans = [];
    // Build span map and identify root spans
    spans.forEach((span) => {
      spanMap.set(span.spanId, span);
      if (!span.parentSpanId) {
        rootSpans.push(span);
      }
    });
    // Build tree structure
    const buildNode = (span, level = 0) => {
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
  calculateTraceMetrics(spans) {
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
        spans.map((s) => s.resource.attributes['service.name']).filter(Boolean),
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
  findCriticalPath(spans) {
    // Simplified critical path calculation
    // In practice, this would use more sophisticated algorithms
    const spanMap = new Map(spans.map((s) => [s.spanId, s]));
    const rootSpans = spans.filter((s) => !s.parentSpanId);
    let longestPath = [];
    let maxDuration = 0;
    const findPath = (span, currentPath) => {
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
  async exportSpan(span) {
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
  extractRunId() {
    return window.location.pathname.match(/\/runs\/([^\/]+)/)?.[1];
  }
  extractNodeId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('nodeId') || undefined;
  }
  extractComponent() {
    if (window.location.pathname.includes('/maestro')) {
      return 'maestro-ui';
    }
    return 'frontend';
  }
  extractUserId() {
    // Would typically extract from authentication context
    return 'demo-user';
  }
  extractTenantId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('tenant') || 'default';
  }
  generateInstanceId() {
    return `frontend-${Math.random().toString(36).substring(7)}`;
  }
}
// Global telemetry instance
export const telemetry = new TelemetryManager();
// React hook for telemetry
export const useTelemetry = () => {
  const [activeSpans, setActiveSpans] = React.useState(new Set());
  const startSpan = React.useCallback((name, options) => {
    const spanId = telemetry.startSpan(name, options);
    setActiveSpans((prev) => new Set(prev).add(spanId));
    return spanId;
  }, []);
  const finishSpan = React.useCallback((spanId, options) => {
    telemetry.finishSpan(spanId, options);
    setActiveSpans((prev) => {
      const next = new Set(prev);
      next.delete(spanId);
      return next;
    });
  }, []);
  const recordEvent = React.useCallback((spanId, name, attributes) => {
    telemetry.addSpanEvent(spanId, name, attributes);
  }, []);
  const recordError = React.useCallback((spanId, error) => {
    telemetry.recordException(spanId, error);
  }, []);
  const setAttribute = React.useCallback((spanId, key, value) => {
    telemetry.setSpanAttribute(spanId, key, value);
  }, []);
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
export function traced(name) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    const spanName = name || `${target.constructor.name}.${propertyKey}`;
    descriptor.value = async function (...args) {
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
        telemetry.recordException(spanId, error);
        telemetry.finishSpan(spanId, { status: SpanStatus.ERROR });
        throw error;
      }
    };
    return descriptor;
  };
}
// Performance monitoring utilities
export const measurePerformance = (name, fn) => {
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
    telemetry.recordException(spanId, error);
    telemetry.finishSpan(spanId, { status: SpanStatus.ERROR });
    throw error;
  }
};
