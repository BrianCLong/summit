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
const globals_1 = require("@jest/globals");
require("dotenv/config");
const supertest_1 = __importDefault(require("supertest"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const run = process.env.RUN_REPLAY_HARNESS === 'true' &&
    process.env.NO_NETWORK_LISTEN !== 'true';
const describeIf = run ? globals_1.describe : globals_1.describe.skip;
// Mock database BEFORE any module imports it
const mockPool = {
    query: globals_1.jest.fn().mockResolvedValue({ rows: [] }),
    connect: globals_1.jest.fn().mockResolvedValue({
        query: globals_1.jest.fn().mockResolvedValue({ rows: [] }),
        release: globals_1.jest.fn(),
    }),
    end: globals_1.jest.fn(),
};
globals_1.jest.mock('../../config/database.js', () => ({
    initializePostgres: globals_1.jest.fn(),
    getPostgresPool: () => mockPool,
    closePostgresPool: globals_1.jest.fn(),
    getRedisClient: globals_1.jest.fn(() => null),
}));
// Mock audit system to prevent it from trying to initialize
globals_1.jest.mock('../../audit/advanced-audit-system.js', () => ({
    AdvancedAuditSystem: {
        getInstance: globals_1.jest.fn().mockReturnValue({
            logEvent: globals_1.jest.fn(),
            logSecurityEvent: globals_1.jest.fn(),
            flush: globals_1.jest.fn(),
        }),
    },
}));
// Mock provenance ledger
globals_1.jest.mock('../../provenance/ledger.js', () => ({
    ProvenanceLedger: globals_1.jest.fn().mockImplementation(() => ({
        recordEvent: globals_1.jest.fn(),
    })),
}));
// Mock monitoring routes to prevent health.js import issues
globals_1.jest.mock('../../routes/monitoring.js', () => ({
    __esModule: true,
    default: (_req, _res, next) => next(),
}));
// Mock monitoring/health.js to prevent ESM import issues
globals_1.jest.mock('../../monitoring/health.js', () => ({
    performHealthCheck: globals_1.jest.fn().mockResolvedValue({ status: 'healthy' }),
    getCachedHealthStatus: globals_1.jest.fn().mockReturnValue({ status: 'healthy' }),
    livenessProbe: globals_1.jest.fn().mockResolvedValue({ status: 'ok' }),
    readinessProbe: globals_1.jest.fn().mockResolvedValue({ status: 'ready' }),
}));
// Mock config BEFORE importing app
globals_1.jest.mock('../../config.js', () => ({
    cfg: {
        NODE_ENV: 'test',
        PORT: 4000,
        DATABASE_URL: 'postgres://postgres:test@localhost:5432/intelgraph_test',
        NEO4J_URI: 'bolt://localhost:7687',
        NEO4J_USER: 'neo4j',
        NEO4J_PASSWORD: 'test',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        JWT_SECRET: 'test-secret-at-least-32-chars-long-12345',
        JWT_REFRESH_SECRET: 'test-refresh-secret-at-least-32-chars-long',
        CORS_ORIGIN: 'http://localhost:3000',
        RATE_LIMIT_WINDOW_MS: 60000,
        RATE_LIMIT_MAX_REQUESTS: 100,
        RATE_LIMIT_MAX_AUTHENTICATED: 1000,
        CACHE_ENABLED: false,
    },
}));
// Mock worker startup to prevent side effects
globals_1.jest.mock('../../workers/trustScoreWorker.js', () => ({
    startTrustWorker: globals_1.jest.fn(),
}));
globals_1.jest.mock('../../workers/retentionWorker.js', () => ({
    startRetentionWorker: globals_1.jest.fn(),
}));
globals_1.jest.mock('../../middleware/TieredRateLimitMiddleware.js', () => ({
    advancedRateLimiter: {
        middleware: () => (_req, _res, next) => next(),
    },
}));
globals_1.jest.mock('../../webhooks/webhook.worker.js', () => ({
    webhookWorker: {},
}));
// Mock config/production-security.js used in app.ts
globals_1.jest.mock('../../config/production-security.js', () => ({
    productionAuthMiddleware: (_req, _res, next) => next(),
    applyProductionSecurity: globals_1.jest.fn(),
}));
// Mock Neo4j driver
const mockRun = globals_1.jest.fn().mockResolvedValue({
    records: [],
});
const mockSession = {
    run: mockRun,
    close: globals_1.jest.fn(),
};
const mockDriver = {
    session: () => mockSession,
    close: globals_1.jest.fn(),
};
globals_1.jest.mock('../../db/neo4j.js', () => ({
    getNeo4jDriver: () => mockDriver,
}));
// Mock Telemetry to avoid issues
globals_1.jest.mock('../../lib/telemetry/comprehensive-telemetry.js', () => ({
    telemetry: {
        incrementActiveConnections: globals_1.jest.fn(),
        decrementActiveConnections: globals_1.jest.fn(),
        recordRequest: globals_1.jest.fn(),
        subsystems: {
            api: { requests: { add: globals_1.jest.fn() }, errors: { add: globals_1.jest.fn() } },
        },
    },
}));
globals_1.jest.mock('../../lib/telemetry/diagnostic-snapshotter.js', () => ({
    snapshotter: {
        trackRequest: globals_1.jest.fn(),
        untrackRequest: globals_1.jest.fn(),
    },
}));
globals_1.jest.mock('../../lib/telemetry/anomaly-detector.js', () => ({
    anomalyDetector: {},
}));
// Mock Observability Tracer
globals_1.jest.mock('../../observability/tracer.js', () => ({
    initializeTracing: () => ({
        isInitialized: globals_1.jest.fn(() => true),
        initialize: globals_1.jest.fn().mockResolvedValue(undefined),
    }),
    getTracer: () => ({ startSpan: globals_1.jest.fn(() => ({ end: globals_1.jest.fn() })) }),
}));
// Use process.cwd() to resolve path to incidents directory
const INCIDENTS_DIR = path_1.default.join(process.cwd(), 'src', 'security', '__tests__', 'incidents');
describeIf('S8 - Security Regression Replay Harness', () => {
    let app;
    (0, globals_1.beforeAll)(async () => {
        // Silence console for cleaner test output
        globals_1.jest.spyOn(console, 'log').mockImplementation(() => { });
        globals_1.jest.spyOn(console, 'error').mockImplementation(() => { });
        globals_1.jest.spyOn(console, 'warn').mockImplementation(() => { });
        const { createApp } = await Promise.resolve().then(() => __importStar(require('../../app.js')));
        app = await createApp();
    });
    (0, globals_1.afterAll)(() => {
        globals_1.jest.restoreAllMocks();
    });
    // Dynamic Test Generation
    // Check if directory exists
    if (!fs_1.default.existsSync(INCIDENTS_DIR)) {
        test('No incidents directory found', () => {
            console.warn(`Incidents directory not found at ${INCIDENTS_DIR}`);
        });
        return;
    }
    const incidentFiles = fs_1.default
        .readdirSync(INCIDENTS_DIR)
        .filter((file) => file.endsWith('.json'));
    if (incidentFiles.length === 0) {
        test('No incidents found', () => {
            console.warn('No security incidents found to replay.');
        });
    }
    incidentFiles.forEach((file) => {
        const incidentPath = path_1.default.join(INCIDENTS_DIR, file);
        const incident = JSON.parse(fs_1.default.readFileSync(incidentPath, 'utf8'));
        (0, globals_1.describe)(`Incident: ${incident.id}`, () => {
            test(`${incident.description}`, async () => {
                for (const step of incident.steps) {
                    // Cast to any to allow dynamic method access
                    let req = (0, supertest_1.default)(app)[step.method.toLowerCase()](step.path);
                    if (step.headers) {
                        for (const [key, value] of Object.entries(step.headers)) {
                            req.set(key, value);
                        }
                    }
                    if (step.body) {
                        req.send(step.body);
                    }
                    const response = await req;
                    // Assertions
                    if (step.expect.status) {
                        (0, globals_1.expect)(response.status).toBe(step.expect.status);
                    }
                    if (step.expect.bodyContains) {
                        (0, globals_1.expect)(JSON.stringify(response.body)).toContain(step.expect.bodyContains);
                    }
                    if (step.expect.bodyNotContains) {
                        (0, globals_1.expect)(JSON.stringify(response.body)).not.toContain(step.expect.bodyNotContains);
                    }
                }
            });
        });
    });
});
