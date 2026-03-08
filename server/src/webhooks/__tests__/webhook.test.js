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
// import { createApp } from '../../app.js';
const pg_js_1 = require("../../db/pg.js");
const webhook_queue_js_1 = require("../webhook.queue.js");
const express_1 = __importDefault(require("express"));
const webhook_service_js_1 = require("../webhook.service.js");
// Mock pg module
globals_1.jest.mock('../../db/pg.js', () => ({
    pg: {
        oneOrNone: globals_1.jest.fn(),
        many: globals_1.jest.fn(),
    },
}));
// Mock Queue
globals_1.jest.mock('../webhook.queue.js', () => ({
    webhookQueue: {
        add: globals_1.jest.fn(),
    },
}));
const describeIf = process.env.NO_NETWORK_LISTEN === 'true' ? globals_1.describe.skip : globals_1.describe;
describeIf('Webhook API', () => {
    let app;
    const tenantId = 'test-tenant-id';
    (0, globals_1.beforeAll)(async () => {
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use('/api/webhooks', (await Promise.resolve().then(() => __importStar(require('../../routes/webhooks.js')))).default);
    });
    afterEach(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.afterAll)(async () => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('POST /api/webhooks', () => {
        (0, globals_1.it)('should create a webhook', async () => {
            const webhookData = {
                url: 'https://example.com/webhook',
                event_types: ['incident.created'],
            };
            const mockWebhook = {
                id: 'webhook-123',
                tenant_id: tenantId,
                ...webhookData,
                secret: 'generated-secret',
                is_active: true,
            };
            pg_js_1.pg.oneOrNone.mockResolvedValue(mockWebhook);
            const res = await (0, supertest_1.default)(app)
                .post('/api/webhooks')
                .set('x-tenant-id', tenantId)
                .send(webhookData);
            (0, globals_1.expect)(res.status).toBe(201);
            (0, globals_1.expect)(res.body).toEqual(mockWebhook);
            (0, globals_1.expect)(pg_js_1.pg.oneOrNone).toHaveBeenCalledWith(globals_1.expect.stringContaining('INSERT INTO webhooks'), globals_1.expect.any(Array), { tenantId });
        });
        (0, globals_1.it)('should fail with invalid input', async () => {
            const res = await (0, supertest_1.default)(app)
                .post('/api/webhooks')
                .set('x-tenant-id', tenantId)
                .send({
                url: 'not-a-url',
            });
            (0, globals_1.expect)(res.status).toBe(400);
        });
    });
    (0, globals_1.describe)('GET /api/webhooks', () => {
        (0, globals_1.it)('should list webhooks', async () => {
            const mockWebhooks = [
                { id: '1', url: 'https://a.com' },
                { id: '2', url: 'https://b.com' },
            ];
            pg_js_1.pg.many.mockResolvedValue(mockWebhooks);
            const res = await (0, supertest_1.default)(app)
                .get('/api/webhooks')
                .set('x-tenant-id', tenantId);
            (0, globals_1.expect)(res.status).toBe(200);
            (0, globals_1.expect)(res.body).toEqual(mockWebhooks);
        });
    });
    (0, globals_1.describe)('POST /api/webhooks/trigger-test', () => {
        (0, globals_1.it)('should trigger a webhook event', async () => {
            const triggerData = {
                eventType: 'incident.created',
                payload: { id: '123', title: 'Test Incident' },
            };
            const mockWebhooks = [
                { id: 'wh-1', url: 'https://a.com', secret: 'sec-1' },
            ];
            pg_js_1.pg.many.mockResolvedValue(mockWebhooks); // For getting subscribers
            pg_js_1.pg.oneOrNone.mockResolvedValue({ id: 'delivery-1' }); // For creating delivery
            const res = await (0, supertest_1.default)(app)
                .post('/api/webhooks/trigger-test')
                .set('x-tenant-id', tenantId)
                .send(triggerData);
            (0, globals_1.expect)(res.status).toBe(200);
            (0, globals_1.expect)(webhook_queue_js_1.webhookQueue.add).toHaveBeenCalledWith('deliver-webhook', globals_1.expect.objectContaining({
                deliveryId: 'delivery-1',
                webhookId: 'wh-1',
                tenantId,
                eventType: triggerData.eventType,
                payload: triggerData.payload,
                triggerType: 'event'
            }));
        });
    });
    (0, globals_1.describe)('POST /api/webhooks/:id/test', () => {
        (0, globals_1.it)('queues a targeted test delivery', async () => {
            const spy = globals_1.jest
                .spyOn(webhook_service_js_1.webhookService, 'triggerWebhook')
                .mockResolvedValue({ id: 'delivery-test' });
            const res = await (0, supertest_1.default)(app)
                .post('/api/webhooks/wh-99/test')
                .set('x-tenant-id', tenantId)
                .send({ payload: { ping: true } });
            (0, globals_1.expect)(res.status).toBe(200);
            (0, globals_1.expect)(res.body.deliveryId).toBe('delivery-test');
            (0, globals_1.expect)(spy).toHaveBeenCalledWith(tenantId, 'wh-99', 'webhook.test', globals_1.expect.objectContaining({ ping: true }), 'test');
        });
        (0, globals_1.it)('returns 404 when webhook is missing', async () => {
            globals_1.jest.spyOn(webhook_service_js_1.webhookService, 'triggerWebhook').mockResolvedValue(null);
            const res = await (0, supertest_1.default)(app)
                .post('/api/webhooks/missing/test')
                .set('x-tenant-id', tenantId)
                .send({});
            (0, globals_1.expect)(res.status).toBe(404);
        });
    });
});
