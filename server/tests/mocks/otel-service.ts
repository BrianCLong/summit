// Otel mock that survives Jest resetMocks: true
// Consolidates mocks for observability/tracer, observability/telemetry, and middleware/observability/otel-tracing

// Stable mock span object
export const mockSpan = {
  end: () => { },
  setStatus: () => { },
  recordException: () => { },
  setAttribute: () => { },
  setAttributes: () => { },
  addEvent: () => { },
  spanContext: () => ({
    traceId: 'mock-trace-id',
    spanId: 'mock-span-id',
    traceFlags: 1,
  }),
  isRecording: () => true,
  updateName: () => { },
};

// The otel service that all imports will receive
export const otelService = {
  start: () => { },
  shutdown: () => Promise.resolve(),
  initialize: () => Promise.resolve(),
  isInitialized: () => true,
  // Core tracing methods - these return mockSpan directly
  startSpan: (_name?: string, _options?: any) => mockSpan,
  createSpan: () => mockSpan,
  getCurrentSpan: () => mockSpan,
  getCurrentTraceContext: () => null,
  trace: (_name: any, fn: any) => fn(mockSpan),
  withSpan: async (_name: string, fn: (span: any) => Promise<any>) => fn(mockSpan),
  // Database wrapper helpers
  wrapNeo4jOperation: (fn: any) => fn(),
  wrapPostgresQuery: (fn: any) => fn(),
  wrapRedisOperation: (fn: any) => fn(),
  traceDbQuery: async (_db: string, _op: string, _query: string, fn: () => Promise<any>) => fn(),
  traceCacheOperation: async (_op: string, _key: string, fn: () => Promise<any>) => fn(),
  traceServiceMethod: async (_svc: string, _method: string, fn: () => Promise<any>) => fn(),
  // Context methods
  getTraceId: () => 'mock-trace-id',
  getSpanId: () => 'mock-span-id',
  setAttribute: () => { },
  addSpanAttributes: () => { },
  addEvent: () => { },
  recordException: () => { },
  extractContext: () => ({}),
  injectContext: () => { },
  // OTel API proxies
  getTracer: () => otelService,
  getMeter: () => ({
    createCounter: () => ({ add: () => { } }),
    createHistogram: () => ({ record: () => { } }),
    createUpDownCounter: () => ({ add: () => { } }),
    createGauge: () => ({ record: () => { }, set: () => { } }),
  }),
};

// Mock for OTelTracingService (middleware/observability/otel-tracing)
export class OTelTracingService {
  private static instance: OTelTracingService;
  public static getInstance(): OTelTracingService {
    if (!OTelTracingService.instance) {
      OTelTracingService.instance = new OTelTracingService();
    }
    return OTelTracingService.instance;
  }
  createMiddleware() { return (_req: any, _res: any, next: any) => next(); }
  traceDatabaseOperation = (fn: any) => async (op: any) => op();
  traceXAIOperation = (fn: any) => async (op: any) => op();
  traceStreamingOperation = (fn: any) => async (op: any) => op();
  traceAuthorityCheck = (fn: any) => async (op: any) => op();
  recordException = () => { };
  addSpanAttributes = () => { };
  createSpan = () => mockSpan;
}

export const otelMiddleware = () => (_req: any, _res: any, next: any) => next();

const mockMetric = { add: () => { }, record: () => { }, set: () => { }, observe: () => { }, processMetric: () => { }, updateBaseline: () => { } };

export const telemetry = {
  recordRequest: () => { },
  incrementActiveConnections: () => { },
  decrementActiveConnections: () => { },
  onMetric: () => { },
  subsystems: {
    database: { queries: mockMetric, errors: mockMetric, latency: mockMetric },
    cache: { hits: mockMetric, misses: mockMetric, sets: mockMetric, dels: mockMetric },
    api: { requests: mockMetric, errors: mockMetric }
  },
  requestDuration: mockMetric,
};

// Mock for diagnostic-snapshotter.ts
export const snapshotter = {
  trackRequest: () => { },
  untrackRequest: () => { },
  triggerSnapshot: () => { },
};

export class DiagnosticSnapshotter {
  trackRequest() { }
  untrackRequest() { }
  triggerSnapshot() { }
}

// Mock for anomaly-detector.ts
export const anomalyDetector = {
  processMetric: () => { },
  updateBaseline: () => { },
  detectAnomalies: () => { },
  triggerAlert: () => { },
};

// Mock for telemetry.ts
export const initializeTelemetry = () => ({
  start: async () => { },
  shutdown: async () => { },
});

export const businessMetrics = {
  nlToCypherRequests: mockMetric,
  nlToCypherParseTime: mockMetric,
  nlToCypherValidity: mockMetric,
  cypherQueryExecutions: mockMetric,
  cypherQueryDuration: mockMetric,
  graphHopQueries: mockMetric,
  graphQueryComplexity: mockMetric,
  provenanceWrites: mockMetric,
  evidenceRegistrations: mockMetric,
  claimCreations: mockMetric,
  exportRequests: mockMetric,
  exportBlocks: mockMetric,
  policyEvaluations: mockMetric,
  policyDecisionTime: mockMetric,
  costBudgetUtilization: mockMetric,
  queryBudgetConsumed: mockMetric,
  connectorIngests: mockMetric,
  connectorErrors: mockMetric,
  connectorLatency: mockMetric,
};

export class TracingService {
  static getInstance() {
    return otelService;
  }
  start = otelService.start;
  shutdown = otelService.shutdown;
  initialize = otelService.initialize;
  isInitialized = otelService.isInitialized;
  createSpan = otelService.createSpan;
  trace = otelService.trace;
  wrapNeo4jOperation = otelService.wrapNeo4jOperation;
  wrapPostgresQuery = otelService.wrapPostgresQuery;
  wrapRedisOperation = otelService.wrapRedisOperation;
}

export const tracer = otelService;
export const initializeTracing = (_config?: any) => otelService;
export const getTracer = (_name?: string) => otelService;

// From otel.ts (the main entry point)
export const startOtel = () => Promise.resolve();
export const isOtelStarted = () => true;

// From telemetry.ts
export const createSpan = <T>(name: string, fn: (span: any) => Promise<T> | T) => Promise.resolve(fn(mockSpan));
export const addSpanAttributes = () => { };
export const tracingMiddleware = () => (_req: any, _res: any, next: any) => next();

export const SpanKind = {
  INTERNAL: 0,
  SERVER: 1,
  CLIENT: 2,
  PRODUCER: 3,
  CONSUMER: 4,
};
export const SpanStatusCode = {
  UNSET: 0,
  OK: 1,
  ERROR: 2,
};

export default otelService;
