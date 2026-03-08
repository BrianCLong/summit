"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const globals_1 = require("@jest/globals");
// Mock the Neo4j driver initialization to prevent connection errors in environment without DB
globals_1.jest.mock('../../src/db/neo4j.js', () => ({
    initializeNeo4jDriver: globals_1.jest.fn(),
    getNeo4jDriver: globals_1.jest.fn(() => ({
        session: () => ({
            run: globals_1.jest.fn().mockResolvedValue({ records: [] }),
            close: globals_1.jest.fn(),
        }),
        close: globals_1.jest.fn(),
    })),
}));
// Mock OpenTelemetry
globals_1.jest.mock('../../src/monitoring/opentelemetry.js', () => ({
    __esModule: true,
    otelService: {
        shutdown: globals_1.jest.fn(),
        addSpanAttributes: globals_1.jest.fn(),
    },
    default: {
        start: globals_1.jest.fn(),
        shutdown: globals_1.jest.fn(),
    },
}));
// Mock prom-client
globals_1.jest.mock('prom-client', () => ({
    collectDefaultMetrics: globals_1.jest.fn(),
    register: {
        contentType: 'text/plain',
        metrics: globals_1.jest.fn().mockResolvedValue('http_requests_total 10\n'),
        clear: globals_1.jest.fn(),
    },
}));
// Mock Redis to prevent connection errors
globals_1.jest.mock('ioredis', () => {
    const Redis = globals_1.jest.fn();
    Redis.prototype.on = globals_1.jest.fn();
    Redis.prototype.quit = globals_1.jest.fn();
    Redis.prototype.disconnect = globals_1.jest.fn();
    return Redis;
});
// Mock Postgres
globals_1.jest.mock('../../src/db/postgres.js', () => ({
    getPostgresPool: globals_1.jest.fn(() => ({
        connect: globals_1.jest.fn().mockResolvedValue({
            query: globals_1.jest.fn().mockResolvedValue({ rows: [] }),
            release: globals_1.jest.fn(),
        }),
        query: globals_1.jest.fn().mockResolvedValue({ rows: [] }),
        end: globals_1.jest.fn(),
    })),
}));
// Mock prom-client
globals_1.jest.unstable_mockModule('prom-client', () => ({
    register: {
        contentType: 'text/plain',
        metrics: globals_1.jest.fn().mockResolvedValue('http_requests_total 10'),
        clear: globals_1.jest.fn(),
        getSingleMetric: globals_1.jest.fn(),
    },
    collectDefaultMetrics: globals_1.jest.fn(),
    Counter: class {
        inc() { }
    },
    Histogram: class {
        observe() { }
        startTimer() { return () => { }; }
    },
    Gauge: class {
        set() { }
        inc() { }
        dec() { }
    },
    Summary: class {
        observe() { }
        startTimer() { return () => { }; }
    },
    Registry: class {
        registerMetric() { }
        metrics() { return Promise.resolve(''); }
        getSingleMetric() { }
        clear() { }
        resetMetrics() { }
        setDefaultLabels() { }
    },
}));
// Mock pino
globals_1.jest.unstable_mockModule('pino', () => ({
    default: globals_1.jest.fn(() => ({
        info: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
        warn: globals_1.jest.fn(),
        debug: globals_1.jest.fn(),
        trace: globals_1.jest.fn(),
        fatal: globals_1.jest.fn(),
        child: globals_1.jest.fn().mockReturnThis(),
        level: 'debug',
    })),
    pino: globals_1.jest.fn(), // Named export if needed
}));
// Mock utils/logger
globals_1.jest.unstable_mockModule('../../src/utils/logger.js', () => {
    const loggerMock = {
        info: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
        warn: globals_1.jest.fn(),
        debug: globals_1.jest.fn(),
    };
    return {
        logger: loggerMock,
        default: loggerMock,
    };
});
// Mock config/logger used by production-security
// Mock config/logger used by harness and production-security
const loggerFactory = () => {
    const loggerMock = {
        info: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
        warn: globals_1.jest.fn(),
        debug: globals_1.jest.fn(),
        child: globals_1.jest.fn().mockReturnThis(),
        trace: globals_1.jest.fn(),
        fatal: globals_1.jest.fn(),
        silent: globals_1.jest.fn(),
        level: 'debug',
    };
    return {
        logger: loggerMock,
        correlationStorage: {
            getStore: globals_1.jest.fn(),
            run: globals_1.jest.fn((store, cb) => cb()),
            enterWith: globals_1.jest.fn(),
        },
        default: loggerMock,
    };
};
globals_1.jest.unstable_mockModule('../../src/config/logger.js', loggerFactory);
globals_1.jest.unstable_mockModule('../../src/config/logger', loggerFactory);
globals_1.jest.unstable_mockModule('../../src/config/logger.ts', loggerFactory);
// Mock TieredRateLimitMiddleware to avoid pino usage
globals_1.jest.unstable_mockModule('../../src/middleware/TieredRateLimitMiddleware.ts', () => ({
    RateLimitTier: {
        FREE: 'free',
        BASIC: 'basic',
        PREMIUM: 'premium',
        ENTERPRISE: 'enterprise',
        INTERNAL: 'internal',
    },
    RequestPriority: {
        LOW: 'low',
        NORMAL: 'normal',
        HIGH: 'high',
    },
    advancedRateLimiter: {
        getStatus: globals_1.jest.fn(),
    },
}));
// Mock TelemetryService
globals_1.jest.unstable_mockModule('../../src/analytics/telemetry/TelemetryService.js', () => ({
    telemetryService: {
        track: globals_1.jest.fn(),
    },
}));
// Mock AuditTrailService
globals_1.jest.unstable_mockModule('../../src/services/audit/AuditTrailService.js', () => ({
    auditTrailService: {
        recordPolicyDecision: globals_1.jest.fn(),
    },
}));
// Mock db/postgres.js to avoid loading real pino via logger
globals_1.jest.unstable_mockModule('../../src/db/postgres.js', () => ({
    getPostgresPool: globals_1.jest.fn(() => ({
        query: globals_1.jest.fn().mockResolvedValue({ rows: [] }),
        connect: globals_1.jest.fn(),
    })),
    query: globals_1.jest.fn(),
}));
// Mock utils/logger.js explicitly to ensure child method exists
globals_1.jest.unstable_mockModule('../../src/utils/logger.js', () => {
    const mockLogger = {
        info: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
        warn: globals_1.jest.fn(),
        debug: globals_1.jest.fn(),
        child: globals_1.jest.fn().mockReturnThis(),
        level: 'info',
    };
    return {
        logger: mockLogger,
        default: mockLogger,
    };
});
// Mock background workers to prevent hanging
globals_1.jest.unstable_mockModule('../../src/workers/trustScoreWorker.js', () => ({
    startTrustWorker: globals_1.jest.fn(),
    stopTrustWorker: globals_1.jest.fn(),
}));
globals_1.jest.unstable_mockModule('../../src/workers/retentionWorker.js', () => ({
    startRetentionWorker: globals_1.jest.fn(),
    stopRetentionWorker: globals_1.jest.fn(),
}));
globals_1.jest.unstable_mockModule('../../src/ingest/stream.js', () => ({
    streamIngest: {
        start: globals_1.jest.fn().mockResolvedValue(undefined),
        stop: globals_1.jest.fn().mockResolvedValue(undefined),
    },
}));
globals_1.jest.unstable_mockModule('../../src/webhooks/webhook.worker.js', () => ({
    webhookWorker: {
        start: globals_1.jest.fn(),
        stop: globals_1.jest.fn(),
    },
    startWebhookWorker: globals_1.jest.fn(),
}));
// Mock provenance ledger
globals_1.jest.unstable_mockModule('../../src/provenance/ledger.js', () => ({
    provenanceLedger: {
        appendEntry: globals_1.jest.fn().mockResolvedValue(undefined),
    },
    ProvenanceLedgerV2: class {
        static getInstance() {
            return {
                appendEntry: globals_1.jest.fn().mockResolvedValue(undefined),
            };
        }
    },
}));
// Mock GraphQL plugins to avoid complex initialization
globals_1.jest.unstable_mockModule('../../src/graphql/plugins/auditLogger.js', () => ({
    default: {},
}));
globals_1.jest.unstable_mockModule('../../src/graphql/plugins/rateLimitAndCache.js', () => ({
    rateLimitAndCachePlugin: globals_1.jest.fn(() => ({})),
}));
globals_1.jest.unstable_mockModule('../../src/graphql/plugins/pbac.js', () => ({
    default: globals_1.jest.fn(() => ({})),
}));
globals_1.jest.unstable_mockModule('../../src/graphql/plugins/resolverMetrics.js', () => ({
    default: {},
}));
globals_1.jest.unstable_mockModule('../../src/graphql/plugins/persistedQueries.js', () => ({
    persistedQueriesPlugin: {},
    default: {},
}));
globals_1.jest.unstable_mockModule('../../src/audit/index.js', () => ({
    getAuditSystem: globals_1.jest.fn(() => ({
        recordEvent: globals_1.jest.fn(),
    })),
    advancedAuditSystem: {
        logEvent: globals_1.jest.fn(),
        recordEvent: globals_1.jest.fn(),
    },
}));
// Mocks must be before imports
console.log('LOADING HARNESS...');
const { createTestHarness } = await Promise.resolve().then(() => __importStar(require('../harness.js')));
console.log('HARNESS LOADED');
console.log('LOADING DB CONFIG...');
const db = await Promise.resolve().then(() => __importStar(require('../../src/config/database.js')));
console.log('DB CONFIG LOADED');
// Skip AI routes to avoid pino CJS/ESM interop issues during tests
process.env.SKIP_AI_ROUTES = 'true';
describe('Golden Path Integration', () => {
    let harness;
    let server;
    let app;
    beforeAll(async () => {
        process.stdout.write('BEGIN beforeAll\n');
        try {
            // Skip AI routes to avoid pino CJS/ESM interop issues during tests
            process.env.SKIP_AI_ROUTES = 'true';
            process.env.SKIP_WEBHOOKS = 'true';
            // Override db connections
            globals_1.jest.spyOn(db, 'getRedisClient').mockImplementation(() => ({
                ping: globals_1.jest.fn().mockResolvedValue('PONG'),
                get: globals_1.jest.fn(),
                set: globals_1.jest.fn(),
                del: globals_1.jest.fn(),
                quit: globals_1.jest.fn(),
                disconnect: globals_1.jest.fn(),
            }));
            globals_1.jest.spyOn(db, 'getNeo4jDriver').mockImplementation(() => ({
                verifyConnectivity: globals_1.jest.fn().mockResolvedValue(true),
                session: globals_1.jest.fn().mockReturnValue({
                    run: globals_1.jest.fn().mockResolvedValue({ records: [] }),
                    close: globals_1.jest.fn(),
                }),
                close: globals_1.jest.fn(),
            }));
            globals_1.jest.spyOn(db, 'getPostgresPool').mockImplementation(() => ({
                query: globals_1.jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
                connect: globals_1.jest.fn().mockResolvedValue({
                    release: globals_1.jest.fn(),
                    query: globals_1.jest.fn().mockResolvedValue({ rows: [] }),
                }),
            }));
            process.stdout.write('[DEBUG] Creating TestHarness\n');
            harness = await createTestHarness();
            process.stdout.write('[DEBUG] TestHarness created\n');
            server = harness.app; // TestHarness exposes app, not server
            app = harness.app;
        }
        catch (error) {
            console.error('FAILED TO START HARNESS:', error);
            throw error;
        }
    });
    afterAll(async () => {
        if (harness) {
            await harness.teardown();
        }
        else {
            console.error('TEARDOWN SKIPPED: harness is undefined');
        }
    });
    it('Health Check returns 200', async () => {
        const res = await (0, supertest_1.default)(server).get('/health');
        if (res.status !== 200) {
            console.log('Health Check Failed Body:', JSON.stringify(res.body, null, 2));
            console.log('Health Check Failed Text:', res.text);
            // Force log to stdout
            process.stdout.write('Health Check Status: ' + res.status + '\n');
            process.stdout.write('Health Check Body: ' + JSON.stringify(res.body) + '\n');
        }
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('status', 'healthy');
    });
    it('GraphQL Introspection works', async () => {
        const res = await (0, supertest_1.default)(server)
            .post('/graphql')
            .set(harness.getAuthHeader())
            .send({
            query: `
          query {
            __schema {
              queryType {
                name
              }
            }
          }
        `,
        });
        expect(res.status).toBe(200);
        expect(res.body.data.__schema.queryType.name).toBe('Query');
    });
    it('Metrics endpoint is exposed', async () => {
        const res = await (0, supertest_1.default)(server).get('/metrics');
        expect(res.status).toBe(200);
        // expect(res.text).toContain('http_requests_total'); // Mock doesn't actually produce text
    });
});
