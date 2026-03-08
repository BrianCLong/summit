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
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const rateLimit_js_1 = require("../../config/rateLimit.js");
const rateLimit_js_2 = require("../../middleware/rateLimit.js");
// Mock SchemaRegistryService and WorkflowService to avoid loading full dependency tree
globals_1.jest.unstable_mockModule('../../governance/ontology/SchemaRegistryService', () => ({
    SchemaRegistryService: {
        getInstance: () => ({
            listSchemas: () => [],
        }),
    },
}));
globals_1.jest.unstable_mockModule('../../governance/ontology/WorkflowService', () => ({
    WorkflowService: {
        getInstance: () => ({}),
    },
}));
globals_1.jest.unstable_mockModule('../../middleware/auth', () => ({
    ensureAuthenticated: (req, _res, next) => {
        req.user = { id: 'test-user', role: 'admin' };
        next();
    },
}));
const governanceRouter = (await Promise.resolve().then(() => __importStar(require('../governance')))).default;
(0, globals_1.describe)('Governance Rate Limiting', () => {
    let app;
    (0, globals_1.beforeEach)(() => {
        (0, rateLimit_js_2.resetRateLimitStore)();
        (0, rateLimit_js_1.setRateLimitConfig)({
            enabled: true,
            store: 'memory',
            groups: {
                default: { limit: 100, windowMs: 60000 },
                webhookIngest: { limit: 30, windowMs: 60000 },
                governance: { limit: 2, windowMs: 60000 }, // Low limit for testing
                caseWorkflow: { limit: 60, windowMs: 60000 },
            },
        });
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use('/api/governance', governanceRouter);
    });
    afterEach(() => {
        (0, rateLimit_js_1.resetRateLimitConfig)();
    });
    (0, globals_1.it)('should allow requests within the rate limit', async () => {
        const response1 = await (0, supertest_1.default)(app).get('/api/governance/schemas');
        (0, globals_1.expect)(response1.status).toBe(200);
        const response2 = await (0, supertest_1.default)(app).get('/api/governance/schemas');
        (0, globals_1.expect)(response2.status).toBe(200);
    });
    (0, globals_1.it)('should return 429 when rate limit is exceeded', async () => {
        await (0, supertest_1.default)(app).get('/api/governance/schemas');
        await (0, supertest_1.default)(app).get('/api/governance/schemas');
        const response = await (0, supertest_1.default)(app).get('/api/governance/schemas');
        (0, globals_1.expect)(response.status).toBe(429);
        (0, globals_1.expect)(response.body.error).toBe('rate_limit_exceeded');
        (0, globals_1.expect)(response.header).toHaveProperty('x-ratelimit-remaining', '0');
        (0, globals_1.expect)(response.header).toHaveProperty('retry-after');
    });
});
