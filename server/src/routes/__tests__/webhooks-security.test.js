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
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
// Mock dependencies
globals_1.jest.unstable_mockModule('../../services/ticket-links.js', () => ({
    addTicketRunLink: globals_1.jest.fn(),
    addTicketDeploymentLink: globals_1.jest.fn(),
    extractTicketFromPR: globals_1.jest.fn(),
}));
globals_1.jest.unstable_mockModule('../../services/lifecycle-listeners.js', () => ({
    LifecycleManager: {
        emitRunEvent: globals_1.jest.fn(),
        emitDeploymentEvent: globals_1.jest.fn(),
    },
}));
globals_1.jest.unstable_mockModule('../../webhooks/webhook.service.js', () => ({
    webhookService: {
        createWebhook: globals_1.jest.fn(),
        getWebhooks: globals_1.jest.fn(),
        getWebhook: globals_1.jest.fn(),
        updateWebhook: globals_1.jest.fn(),
        deleteWebhook: globals_1.jest.fn(),
        getDeliveries: globals_1.jest.fn(),
        triggerEvent: globals_1.jest.fn(),
    },
    CreateWebhookSchema: { parse: (x) => x },
    UpdateWebhookSchema: { parse: (x) => x },
}));
// Mock observability to avoid errors during import
globals_1.jest.unstable_mockModule('../../observability/index.js', () => ({
    logger: {
        info: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
        warn: globals_1.jest.fn(),
        child: globals_1.jest.fn().mockReturnThis(),
    },
    metrics: {
        incrementCounter: globals_1.jest.fn(),
    },
    tracer: {
        trace: globals_1.jest.fn((name, fn) => fn({
            setStatus: globals_1.jest.fn(),
            setAttributes: globals_1.jest.fn(),
            recordException: globals_1.jest.fn(),
        })),
    },
}));
describe('Webhooks Security', () => {
    let app;
    let originalEnv;
    beforeAll(async () => {
        originalEnv = { ...process.env };
        // Simulate Production
        process.env.NODE_ENV = 'production';
        // Ensure secrets are unset
        delete process.env.JIRA_WEBHOOK_SECRET;
        delete process.env.LIFECYCLE_WEBHOOK_SECRET;
        // Dynamic import to apply mocks and env vars
        const webhooksRouter = (await Promise.resolve().then(() => __importStar(require('../webhooks.js')))).default;
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use('/api/webhooks', webhooksRouter);
    });
    afterAll(() => {
        process.env = originalEnv;
    });
    it('should reject Jira webhook when secret is missing in production', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/api/webhooks/jira')
            .send({
            webhookEvent: 'jira:issue_created',
            issue: { key: 'TEST-123' }
        });
        expect(res.status).toBe(500);
        expect(res.body).toEqual({ error: 'Server configuration error' });
    });
    it('should reject Lifecycle webhook when secret is missing in production', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/api/webhooks/lifecycle')
            .send({
            event_type: 'run_created',
            id: '123'
        });
        expect(res.status).toBe(500);
        expect(res.body).toEqual({ error: 'Server configuration error' });
    });
});
