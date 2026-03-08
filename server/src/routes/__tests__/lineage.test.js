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
const run = process.env.NO_NETWORK_LISTEN !== 'true';
const describeIf = run ? globals_1.describe : globals_1.describe.skip;
describeIf('lineage route', () => {
    let app;
    const originalEnv = process.env;
    (0, globals_1.beforeEach)(async () => {
        globals_1.jest.resetModules();
        process.env = { ...originalEnv };
        const lineageRouter = (await Promise.resolve().then(() => __importStar(require('../lineage.js')))).default;
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use('/api/lineage', lineageRouter);
    });
    (0, globals_1.afterAll)(() => {
        process.env = originalEnv;
    });
    (0, globals_1.describe)('GET /:id', () => {
        (0, globals_1.it)('returns lineage graph for a known id', async () => {
            const response = await (0, supertest_1.default)(app).get('/api/lineage/evidence-123');
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.targetId).toBe('evidence-123');
            (0, globals_1.expect)(response.body.mode).toBe('read-only');
            (0, globals_1.expect)(response.body.upstream).toHaveLength(2);
            (0, globals_1.expect)(response.body.downstream).toHaveLength(2);
            (0, globals_1.expect)(response.body.policyTags).toContain('PII');
        });
        (0, globals_1.it)('returns restricted context without leaking upstream details', async () => {
            const response = await (0, supertest_1.default)(app).get('/api/lineage/case-locked');
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.restricted).toBe(true);
            (0, globals_1.expect)(response.body.restrictionReason).toMatch(/warrant/i);
            (0, globals_1.expect)(response.body.upstream[0].restricted).toBe(true);
        });
        (0, globals_1.it)('returns 404 for unknown ids', async () => {
            const response = await (0, supertest_1.default)(app).get('/api/lineage/unknown');
            (0, globals_1.expect)(response.status).toBe(404);
        });
    });
    (0, globals_1.describe)('GET /graph', () => {
        (0, globals_1.it)('returns a 404 if the feature flag is not enabled', async () => {
            process.env.LINEAGE_UI_CONTRACT = 'false';
            const lineageRouter = (await Promise.resolve().then(() => __importStar(require('../lineage.js')))).default;
            const newApp = (0, express_1.default)();
            newApp.use(express_1.default.json());
            newApp.use('/api/lineage', lineageRouter);
            const response = await (0, supertest_1.default)(newApp).get('/api/lineage/graph?entityId=1&fieldPath=1');
            (0, globals_1.expect)(response.status).toBe(404);
        });
        (0, globals_1.it)('returns the lineage graph fixture when the feature flag is enabled', async () => {
            process.env.LINEAGE_UI_CONTRACT = 'true';
            const lineageRouter = (await Promise.resolve().then(() => __importStar(require('../lineage.js')))).default;
            const newApp = (0, express_1.default)();
            newApp.use(express_1.default.json());
            newApp.use('/api/lineage', lineageRouter);
            const response = await (0, supertest_1.default)(newApp).get('/api/lineage/graph?entityId=1&fieldPath=1');
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.nodes).toBeDefined();
            (0, globals_1.expect)(response.body.edges).toBeDefined();
            (0, globals_1.expect)(response.body.nodes.length).toBe(5);
        });
        (0, globals_1.it)('returns a bad request if entityId or fieldPath is missing', async () => {
            process.env.LINEAGE_UI_CONTRACT = 'true';
            const lineageRouter = (await Promise.resolve().then(() => __importStar(require('../lineage.js')))).default;
            const newApp = (0, express_1.default)();
            newApp.use(express_1.default.json());
            newApp.use('/api/lineage', lineageRouter);
            const res1 = await (0, supertest_1.default)(newApp).get('/api/lineage/graph?entityId=1');
            (0, globals_1.expect)(res1.status).toBe(400);
            const res2 = await (0, supertest_1.default)(newApp).get('/api/lineage/graph?fieldPath=1');
            (0, globals_1.expect)(res2.status).toBe(400);
        });
        (0, globals_1.it)('collapses nodes when the collapse query param is used', async () => {
            process.env.LINEAGE_UI_CONTRACT = 'true';
            const lineageRouter = (await Promise.resolve().then(() => __importStar(require('../lineage.js')))).default;
            const newApp = (0, express_1.default)();
            newApp.use(express_1.default.json());
            newApp.use('/api/lineage', lineageRouter);
            const response = await (0, supertest_1.default)(newApp).get('/api/lineage/graph?entityId=1&fieldPath=1&collapse=evidence');
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.nodes.length).toBe(3);
            (0, globals_1.expect)(response.body.edges.length).toBe(2);
        });
    });
});
