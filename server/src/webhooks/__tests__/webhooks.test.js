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
const axios_1 = __importDefault(require("axios"));
const types_js_1 = require("../types.js");
// Mock functions declared before mocks
const mockQueueAdd = globals_1.jest.fn();
const mockRecordDeliveryMetric = globals_1.jest.fn();
// ESM-compatible mocking using unstable_mockModule
globals_1.jest.unstable_mockModule('bullmq', () => ({
    Queue: globals_1.jest.fn(),
    Worker: globals_1.jest.fn(),
}));
globals_1.jest.unstable_mockModule('../metrics', () => ({
    recordDeliveryMetric: mockRecordDeliveryMetric,
}));
globals_1.jest.unstable_mockModule('../../queues/config', () => ({
    addJob: (queueName, jobName, data, options) => mockQueueAdd(queueName, jobName, data, options),
}));
// Dynamic imports AFTER mocks are set up
const { WebhookService, backoffForAttempt, processDelivery } = await Promise.resolve().then(() => __importStar(require('../service.js')));
const { signPayload, verifySignature } = await Promise.resolve().then(() => __importStar(require('../signature.js')));
const { recordDeliveryMetric } = await Promise.resolve().then(() => __importStar(require('../metrics.js')));
(0, globals_1.describe)('webhook signatures', () => {
    (0, globals_1.it)('validates HMAC signatures', () => {
        const secret = 'top-secret';
        const payload = { example: true };
        const timestamp = 1700000000;
        const idempotencyKey = 'abc-123';
        const signature = signPayload(secret, payload, timestamp, idempotencyKey);
        (0, globals_1.expect)(verifySignature(secret, payload, timestamp, idempotencyKey, signature)).toBe(true);
        (0, globals_1.expect)(verifySignature(secret, payload, timestamp + 1, idempotencyKey, signature)).toBe(false);
    });
});
(0, globals_1.describe)('WebhookService', () => {
    const mockRepository = {
        getSubscriptionsForEvent: globals_1.jest.fn(),
        findDeliveryByKey: globals_1.jest.fn(),
        createDelivery: globals_1.jest.fn(),
        markInProgress: globals_1.jest.fn(),
        markSuccess: globals_1.jest.fn(),
        markFailure: globals_1.jest.fn(),
        recordAttempt: globals_1.jest.fn(),
    };
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.it)('skips duplicate deliveries for the same idempotency key', async () => {
        mockRepository.getSubscriptionsForEvent.mockResolvedValue([
            { id: 'sub-1', target_url: 'https://example.com', secret: 's', tenant_id: 't' },
        ]);
        mockRepository.findDeliveryByKey.mockResolvedValue({
            id: 'delivery-1',
            status: types_js_1.DeliveryStatus.SUCCEEDED,
        });
        const service = new WebhookService(mockRepository, axios_1.default);
        const jobs = await service.enqueueEvent('tenant-1', types_js_1.WebhookEventType.CASE_CREATED, { hello: 'world' }, 'dup-key');
        (0, globals_1.expect)(jobs).toHaveLength(0);
        (0, globals_1.expect)(mockQueueAdd).not.toHaveBeenCalled();
    });
    (0, globals_1.it)('enqueues deliveries with exponential backoff settings', async () => {
        mockRepository.getSubscriptionsForEvent.mockResolvedValue([
            {
                id: 'sub-1',
                target_url: 'https://hooks.example.com',
                secret: 'secret',
                tenant_id: 'tenant-1',
            },
        ]);
        mockRepository.findDeliveryByKey.mockResolvedValue(null);
        mockRepository.createDelivery.mockResolvedValue({
            id: 'delivery-xyz',
        });
        const service = new WebhookService(mockRepository, axios_1.default);
        const jobs = await service.enqueueEvent('tenant-1', types_js_1.WebhookEventType.EXPORT_READY, { job: '123' }, 'unique-key');
        (0, globals_1.expect)(jobs).toHaveLength(1);
        (0, globals_1.expect)(mockQueueAdd).toHaveBeenCalledWith('webhooks', 'deliver-webhook', globals_1.expect.objectContaining({ deliveryId: 'delivery-xyz' }), globals_1.expect.objectContaining({ attempts: 5 }));
        (0, globals_1.expect)(backoffForAttempt(3)).toBe(8000);
    });
    (0, globals_1.it)('reuses in-flight deliveries for matching idempotency keys', async () => {
        mockRepository.getSubscriptionsForEvent.mockResolvedValue([
            {
                id: 'sub-77',
                target_url: 'https://hooks.example.net',
                secret: 'secret',
                tenant_id: 'tenant-99',
            },
        ]);
        mockRepository.findDeliveryByKey.mockResolvedValue({
            id: 'delivery-existing',
            status: types_js_1.DeliveryStatus.PENDING,
        });
        const service = new WebhookService(mockRepository, axios_1.default);
        const jobs = await service.enqueueEvent('tenant-99', types_js_1.WebhookEventType.EXPORT_READY, { id: 'file-1' }, 'idempo-key');
        (0, globals_1.expect)(jobs).toHaveLength(1);
        (0, globals_1.expect)(mockRepository.createDelivery).not.toHaveBeenCalled();
        (0, globals_1.expect)(mockQueueAdd).toHaveBeenCalledWith('webhooks', 'deliver-webhook', globals_1.expect.objectContaining({ deliveryId: 'delivery-existing' }), globals_1.expect.any(Object));
    });
});
(0, globals_1.describe)('processDelivery', () => {
    const repository = {
        markInProgress: globals_1.jest.fn(),
        recordAttempt: globals_1.jest.fn(),
        markSuccess: globals_1.jest.fn(),
        markFailure: globals_1.jest.fn(),
    };
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        globals_1.jest.spyOn(axios_1.default, 'post').mockReset();
    });
    (0, globals_1.it)('marks poison messages after max attempts', async () => {
        const targetUrl = 'https://webhooks.example.com/';
        globals_1.jest.spyOn(axios_1.default, 'post').mockResolvedValue({ status: 500, data: {} });
        const job = {
            deliveryId: 'd1',
            tenantId: 'tenant',
            subscriptionId: 'sub',
            eventType: types_js_1.WebhookEventType.INGEST_COMPLETED,
            targetUrl,
            secret: 'secret',
            payload: { ok: true },
            idempotencyKey: 'idempo',
        };
        const result = await processDelivery(job, 4, repository, axios_1.default);
        (0, globals_1.expect)(result).toBe('poisoned');
        (0, globals_1.expect)(repository.recordAttempt).toHaveBeenCalledWith('tenant', 'd1', 5, types_js_1.DeliveryStatus.POISONED, undefined, undefined, globals_1.expect.stringContaining('Non-success status'), globals_1.expect.any(Number));
        (0, globals_1.expect)(repository.markFailure).toHaveBeenCalledWith('tenant', 'd1', 5, globals_1.expect.stringContaining('Non-success status'), true, undefined);
    });
    (0, globals_1.it)('records retry metadata and metrics when delivery fails but is retryable', async () => {
        globals_1.jest.spyOn(axios_1.default, 'post').mockResolvedValue({ status: 500, data: {} });
        const job = {
            deliveryId: 'd2',
            tenantId: 'tenant',
            subscriptionId: 'sub',
            eventType: types_js_1.WebhookEventType.CASE_CREATED,
            targetUrl: 'https://target.example.com',
            secret: 'secret',
            payload: { caseId: 'abc' },
            idempotencyKey: 'retry-key',
        };
        await (0, globals_1.expect)(processDelivery(job, 1, repository, axios_1.default)).rejects.toThrow('Non-success status 500');
        (0, globals_1.expect)(repository.recordAttempt).toHaveBeenCalledWith('tenant', 'd2', 2, types_js_1.DeliveryStatus.FAILED, undefined, undefined, globals_1.expect.stringContaining('Non-success status'), globals_1.expect.any(Number));
        const [, , , , , nextAttemptAt] = repository.markFailure.mock.calls[0];
        (0, globals_1.expect)(repository.markFailure).toHaveBeenCalledWith('tenant', 'd2', 2, globals_1.expect.stringContaining('Non-success status'), false, globals_1.expect.any(Date));
        (0, globals_1.expect)(nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
        (0, globals_1.expect)(recordDeliveryMetric).toHaveBeenCalledWith(types_js_1.WebhookEventType.CASE_CREATED, 'failure');
    });
    (0, globals_1.it)('records success metrics and marks deliveries complete', async () => {
        globals_1.jest.spyOn(axios_1.default, 'post').mockResolvedValue({ status: 201, data: { ok: true } });
        const job = {
            deliveryId: 'd3',
            tenantId: 'tenant',
            subscriptionId: 'sub',
            eventType: types_js_1.WebhookEventType.EXPORT_READY,
            targetUrl: 'https://target.example.com',
            secret: 'secret',
            payload: { exportId: 'xyz' },
            idempotencyKey: 'ok',
        };
        const result = await processDelivery(job, 0, repository, axios_1.default);
        (0, globals_1.expect)(result).toBe('delivered');
        (0, globals_1.expect)(repository.markSuccess).toHaveBeenCalledWith('tenant', 'd3', 1);
        (0, globals_1.expect)(recordDeliveryMetric).toHaveBeenCalledWith(types_js_1.WebhookEventType.EXPORT_READY, 'success', globals_1.expect.any(Number));
    });
});
