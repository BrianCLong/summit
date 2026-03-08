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
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const globals_1 = require("@jest/globals");
const describeNetwork = process.env.NO_NETWORK_LISTEN === 'true' ? globals_1.describe.skip : globals_1.describe;
const buildLogger = () => {
    const logger = {
        info: globals_1.jest.fn(),
        warn: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
        child: globals_1.jest.fn(),
    };
    logger.child.mockReturnValue(logger);
    return logger;
};
let createPiiGuardMiddleware;
(0, globals_1.beforeAll)(async () => {
    process.env.NODE_ENV = process.env.NODE_ENV || 'test';
    process.env.DATABASE_URL =
        process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/testdb';
    process.env.NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
    process.env.NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
    process.env.NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'devpassword';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'a'.repeat(32);
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'b'.repeat(32);
    process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
    ({ createPiiGuardMiddleware } = await Promise.resolve().then(() => __importStar(require('../pii-guard.js'))));
});
const loggerMock = buildLogger;
describeNetwork('PII guard middleware', () => {
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.it)('detects and redacts PII in the request body without altering the response', async () => {
        const logger = loggerMock();
        const app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use(createPiiGuardMiddleware({ logger, minimumConfidence: 0.2 }));
        app.post('/echo', (req, res) => {
            res.json({
                message: 'ok',
                email: req.body.email,
            });
        });
        const response = await (0, supertest_1.default)(app)
            .post('/echo')
            .send({ email: 'user@example.com', message: 'hello world' })
            .expect(200);
        (0, globals_1.expect)(response.body.email).toBe('user@example.com');
        (0, globals_1.expect)(logger.info).toHaveBeenCalled();
        const logPayload = logger.info.mock.calls[0][0];
        (0, globals_1.expect)(logPayload.piiScan.requestFindings.length).toBeGreaterThan(0);
        (0, globals_1.expect)(logPayload.piiScan.requestFindings[0]).toMatchObject({ path: 'body.email', type: 'email' });
        (0, globals_1.expect)(logPayload.piiScan.redactedRequestPreview).toContain('[REDACTED]');
    });
    (0, globals_1.it)('redacts response bodies before logging', async () => {
        const logger = loggerMock();
        const app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use(createPiiGuardMiddleware({ logger, minimumConfidence: 0.2 }));
        app.get('/user', (_req, res) => {
            res.json({
                profile: {
                    phone: '+1 555 111 2222',
                    name: 'Casey Jones',
                },
            });
        });
        const response = await (0, supertest_1.default)(app).get('/user').expect(200);
        (0, globals_1.expect)(response.body.profile.phone).toBe('+1 555 111 2222');
        (0, globals_1.expect)(logger.info).toHaveBeenCalled();
        const logPayload = logger.info.mock.calls[0][0];
        (0, globals_1.expect)(logPayload.piiScan.redactedResponsePreview).toContain('[REDACTED]');
        (0, globals_1.expect)(logPayload.piiScan.requestFindings).toEqual([]);
    });
});
