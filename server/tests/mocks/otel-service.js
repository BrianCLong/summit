"use strict";
// Otel mock that survives Jest resetMocks: true
// Consolidates mocks for observability/tracer, observability/telemetry, and middleware/observability/otel-tracing
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpanStatusCode = exports.SpanKind = exports.tracingMiddleware = exports.addSpanAttributes = exports.createSpan = exports.isOtelStarted = exports.startOtel = exports.getTracer = exports.initializeTracing = exports.tracer = exports.TracingService = exports.businessMetrics = exports.initializeTelemetry = exports.anomalyDetector = exports.DiagnosticSnapshotter = exports.snapshotter = exports.telemetry = exports.otelMiddleware = exports.OTelTracingService = exports.otelService = exports.mockSpan = void 0;
// Stable mock span object
exports.mockSpan = {
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
exports.otelService = {
    start: () => { },
    shutdown: () => Promise.resolve(),
    initialize: () => Promise.resolve(),
    isInitialized: () => true,
    // Core tracing methods - these return mockSpan directly
    startSpan: (_name, _options) => exports.mockSpan,
    createSpan: () => exports.mockSpan,
    getCurrentSpan: () => exports.mockSpan,
    getCurrentTraceContext: () => null,
    trace: (_name, fn) => fn(exports.mockSpan),
    withSpan: async (_name, fn) => fn(exports.mockSpan),
    // Database wrapper helpers
    wrapNeo4jOperation: (fn) => fn(),
    wrapPostgresQuery: (fn) => fn(),
    wrapRedisOperation: (fn) => fn(),
    traceDbQuery: async (_db, _op, _query, fn) => fn(),
    traceCacheOperation: async (_op, _key, fn) => fn(),
    traceServiceMethod: async (_svc, _method, fn) => fn(),
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
    getTracer: () => exports.otelService,
    getMeter: () => ({
        createCounter: () => ({ add: () => { } }),
        createHistogram: () => ({ record: () => { } }),
        createUpDownCounter: () => ({ add: () => { } }),
        createGauge: () => ({ record: () => { }, set: () => { } }),
    }),
};
// Mock for OTelTracingService (middleware/observability/otel-tracing)
class OTelTracingService {
    static instance;
    static getInstance() {
        if (!OTelTracingService.instance) {
            OTelTracingService.instance = new OTelTracingService();
        }
        return OTelTracingService.instance;
    }
    createMiddleware() { return (_req, _res, next) => next(); }
    traceDatabaseOperation = (fn) => async (op) => op();
    traceXAIOperation = (fn) => async (op) => op();
    traceStreamingOperation = (fn) => async (op) => op();
    traceAuthorityCheck = (fn) => async (op) => op();
    recordException = () => { };
    addSpanAttributes = () => { };
    createSpan = () => exports.mockSpan;
}
exports.OTelTracingService = OTelTracingService;
const otelMiddleware = () => (_req, _res, next) => next();
exports.otelMiddleware = otelMiddleware;
const mockMetric = { add: () => { }, record: () => { }, set: () => { }, observe: () => { }, processMetric: () => { }, updateBaseline: () => { } };
exports.telemetry = {
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
exports.snapshotter = {
    trackRequest: () => { },
    untrackRequest: () => { },
    triggerSnapshot: () => { },
};
class DiagnosticSnapshotter {
    trackRequest() { }
    untrackRequest() { }
    triggerSnapshot() { }
}
exports.DiagnosticSnapshotter = DiagnosticSnapshotter;
// Mock for anomaly-detector.ts
exports.anomalyDetector = {
    processMetric: () => { },
    updateBaseline: () => { },
    detectAnomalies: () => { },
    triggerAlert: () => { },
};
// Mock for telemetry.ts
const initializeTelemetry = () => ({
    start: async () => { },
    shutdown: async () => { },
});
exports.initializeTelemetry = initializeTelemetry;
exports.businessMetrics = {
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
class TracingService {
    static getInstance() {
        return exports.otelService;
    }
    start = exports.otelService.start;
    shutdown = exports.otelService.shutdown;
    initialize = exports.otelService.initialize;
    isInitialized = exports.otelService.isInitialized;
    createSpan = exports.otelService.createSpan;
    trace = exports.otelService.trace;
    wrapNeo4jOperation = exports.otelService.wrapNeo4jOperation;
    wrapPostgresQuery = exports.otelService.wrapPostgresQuery;
    wrapRedisOperation = exports.otelService.wrapRedisOperation;
}
exports.TracingService = TracingService;
exports.tracer = exports.otelService;
const initializeTracing = (_config) => exports.otelService;
exports.initializeTracing = initializeTracing;
const getTracer = (_name) => exports.otelService;
exports.getTracer = getTracer;
// From otel.ts (the main entry point)
const startOtel = () => Promise.resolve();
exports.startOtel = startOtel;
const isOtelStarted = () => true;
exports.isOtelStarted = isOtelStarted;
// From telemetry.ts
const createSpan = (name, fn) => Promise.resolve(fn(exports.mockSpan));
exports.createSpan = createSpan;
const addSpanAttributes = () => { };
exports.addSpanAttributes = addSpanAttributes;
const tracingMiddleware = () => (_req, _res, next) => next();
exports.tracingMiddleware = tracingMiddleware;
exports.SpanKind = {
    INTERNAL: 0,
    SERVER: 1,
    CLIENT: 2,
    PRODUCER: 3,
    CONSUMER: 4,
};
exports.SpanStatusCode = {
    UNSET: 0,
    OK: 1,
    ERROR: 2,
};
exports.default = exports.otelService;
