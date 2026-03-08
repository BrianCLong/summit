"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
// Mock the dependencies before importing the router
vitest_1.vi.mock('../db/database.js', () => ({
    db: {
        connect: vitest_1.vi.fn(),
        disconnect: vitest_1.vi.fn(),
        query: vitest_1.vi.fn(),
        isHealthy: vitest_1.vi.fn().mockResolvedValue(true),
    },
}));
vitest_1.vi.mock('../services/opa-client.js', () => ({
    opaClient: {
        evaluateApprovalRequest: vitest_1.vi.fn(),
        evaluateDecision: vitest_1.vi.fn(),
        isHealthy: vitest_1.vi.fn().mockResolvedValue(true),
    },
}));
vitest_1.vi.mock('../services/provenance-client.js', () => ({
    provenanceClient: {
        createReceipt: vitest_1.vi.fn(),
        isHealthy: vitest_1.vi.fn().mockResolvedValue(true),
    },
}));
vitest_1.vi.mock('../services/approval-service.js', () => ({
    approvalService: {
        createRequest: vitest_1.vi.fn(),
        getRequest: vitest_1.vi.fn(),
        listRequests: vitest_1.vi.fn(),
        submitDecision: vitest_1.vi.fn(),
        cancelRequest: vitest_1.vi.fn(),
    },
}));
const approvals_js_1 = __importDefault(require("../routes/approvals.js"));
const health_js_1 = __importDefault(require("../routes/health.js"));
const approval_service_js_1 = require("../services/approval-service.js");
(0, vitest_1.describe)('Approvals API Routes', () => {
    let app;
    (0, vitest_1.beforeEach)(() => {
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use('/api/v1', approvals_js_1.default);
        app.use('/health', health_js_1.default);
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('POST /api/v1/requests', () => {
        const validRequest = {
            resource: { type: 'deployment', id: 'deploy-123' },
            action: 'deploy',
            requestor: { id: 'user-123', roles: ['developer'] },
        };
        (0, vitest_1.it)('should return 400 when X-Tenant-ID is missing', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/requests')
                .send(validRequest);
            (0, vitest_1.expect)(response.status).toBe(400);
            (0, vitest_1.expect)(response.body.code).toBe('MISSING_TENANT_ID');
        });
        (0, vitest_1.it)('should create a request with valid input', async () => {
            const mockRequest = {
                id: 'req-123',
                tenant_id: 'tenant-1',
                ...validRequest,
                status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            vitest_1.vi.mocked(approval_service_js_1.approvalService.createRequest).mockResolvedValue(mockRequest);
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/requests')
                .set('X-Tenant-ID', 'tenant-1')
                .send(validRequest);
            (0, vitest_1.expect)(response.status).toBe(201);
            (0, vitest_1.expect)(response.body.id).toBe('req-123');
            (0, vitest_1.expect)(approval_service_js_1.approvalService.createRequest).toHaveBeenCalledWith('tenant-1', vitest_1.expect.objectContaining(validRequest), undefined);
        });
        (0, vitest_1.it)('should pass idempotency key to service', async () => {
            const mockRequest = {
                id: 'req-123',
                tenant_id: 'tenant-1',
                ...validRequest,
                status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            vitest_1.vi.mocked(approval_service_js_1.approvalService.createRequest).mockResolvedValue(mockRequest);
            await (0, supertest_1.default)(app)
                .post('/api/v1/requests')
                .set('X-Tenant-ID', 'tenant-1')
                .set('X-Idempotency-Key', 'idem-123')
                .send(validRequest);
            (0, vitest_1.expect)(approval_service_js_1.approvalService.createRequest).toHaveBeenCalledWith('tenant-1', vitest_1.expect.any(Object), 'idem-123');
        });
        (0, vitest_1.it)('should return 422 for invalid request body', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/requests')
                .set('X-Tenant-ID', 'tenant-1')
                .send({ action: 'deploy' }); // Missing required fields
            (0, vitest_1.expect)(response.status).toBe(422);
            (0, vitest_1.expect)(response.body.code).toBe('VALIDATION_ERROR');
        });
    });
    (0, vitest_1.describe)('GET /api/v1/requests', () => {
        (0, vitest_1.it)('should list requests with pagination', async () => {
            const mockResponse = {
                items: [],
                pagination: { total: 0, limit: 20, has_more: false },
            };
            vitest_1.vi.mocked(approval_service_js_1.approvalService.listRequests).mockResolvedValue(mockResponse);
            const response = await (0, supertest_1.default)(app)
                .get('/api/v1/requests')
                .set('X-Tenant-ID', 'tenant-1');
            (0, vitest_1.expect)(response.status).toBe(200);
            (0, vitest_1.expect)(response.body.items).toEqual([]);
            (0, vitest_1.expect)(response.body.pagination).toBeDefined();
        });
        (0, vitest_1.it)('should pass query parameters to service', async () => {
            const mockResponse = {
                items: [],
                pagination: { total: 0, limit: 10, has_more: false },
            };
            vitest_1.vi.mocked(approval_service_js_1.approvalService.listRequests).mockResolvedValue(mockResponse);
            await (0, supertest_1.default)(app)
                .get('/api/v1/requests?status=pending&limit=10')
                .set('X-Tenant-ID', 'tenant-1');
            (0, vitest_1.expect)(approval_service_js_1.approvalService.listRequests).toHaveBeenCalledWith('tenant-1', vitest_1.expect.objectContaining({
                status: ['pending'],
                limit: 10,
            }));
        });
    });
    (0, vitest_1.describe)('GET /api/v1/requests/:requestId', () => {
        (0, vitest_1.it)('should return request by ID', async () => {
            const mockRequest = {
                id: 'req-123',
                tenant_id: 'tenant-1',
                status: 'pending',
            };
            vitest_1.vi.mocked(approval_service_js_1.approvalService.getRequest).mockResolvedValue(mockRequest);
            const response = await (0, supertest_1.default)(app)
                .get('/api/v1/requests/req-123')
                .set('X-Tenant-ID', 'tenant-1');
            (0, vitest_1.expect)(response.status).toBe(200);
            (0, vitest_1.expect)(response.body.id).toBe('req-123');
        });
        (0, vitest_1.it)('should return 404 for non-existent request', async () => {
            vitest_1.vi.mocked(approval_service_js_1.approvalService.getRequest).mockResolvedValue(null);
            const response = await (0, supertest_1.default)(app)
                .get('/api/v1/requests/non-existent')
                .set('X-Tenant-ID', 'tenant-1');
            (0, vitest_1.expect)(response.status).toBe(404);
        });
    });
    (0, vitest_1.describe)('POST /api/v1/requests/:requestId/decision', () => {
        const validDecision = {
            decision: 'approve',
            actor: { id: 'approver-123', roles: ['admin'] },
            reason: 'Looks good',
        };
        (0, vitest_1.it)('should submit a decision', async () => {
            const mockRequest = {
                id: 'req-123',
                tenant_id: 'tenant-1',
                status: 'approved',
            };
            vitest_1.vi.mocked(approval_service_js_1.approvalService.submitDecision).mockResolvedValue(mockRequest);
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/requests/req-123/decision')
                .set('X-Tenant-ID', 'tenant-1')
                .send(validDecision);
            (0, vitest_1.expect)(response.status).toBe(200);
            (0, vitest_1.expect)(approval_service_js_1.approvalService.submitDecision).toHaveBeenCalledWith('tenant-1', 'req-123', vitest_1.expect.objectContaining(validDecision));
        });
    });
    (0, vitest_1.describe)('POST /api/v1/requests/:requestId/cancel', () => {
        (0, vitest_1.it)('should cancel a request', async () => {
            const mockRequest = {
                id: 'req-123',
                tenant_id: 'tenant-1',
                status: 'cancelled',
            };
            vitest_1.vi.mocked(approval_service_js_1.approvalService.cancelRequest).mockResolvedValue(mockRequest);
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/requests/req-123/cancel')
                .set('X-Tenant-ID', 'tenant-1')
                .send({
                actor: { id: 'user-123', roles: ['developer'] },
                reason: 'No longer needed',
            });
            (0, vitest_1.expect)(response.status).toBe(200);
            (0, vitest_1.expect)(response.body.status).toBe('cancelled');
        });
    });
});
(0, vitest_1.describe)('Health Routes', () => {
    let app;
    (0, vitest_1.beforeEach)(() => {
        app = (0, express_1.default)();
        app.use('/health', health_js_1.default);
    });
    (0, vitest_1.describe)('GET /health', () => {
        (0, vitest_1.it)('should return healthy status', async () => {
            const response = await (0, supertest_1.default)(app).get('/health');
            (0, vitest_1.expect)(response.status).toBe(200);
            (0, vitest_1.expect)(response.body.status).toBe('healthy');
        });
    });
    (0, vitest_1.describe)('GET /health/ready', () => {
        (0, vitest_1.it)('should return ready when all checks pass', async () => {
            const response = await (0, supertest_1.default)(app).get('/health/ready');
            (0, vitest_1.expect)(response.status).toBe(200);
            (0, vitest_1.expect)(response.body.ready).toBe(true);
        });
    });
    (0, vitest_1.describe)('GET /health/live', () => {
        (0, vitest_1.it)('should return live', async () => {
            const response = await (0, supertest_1.default)(app).get('/health/live');
            (0, vitest_1.expect)(response.status).toBe(200);
            (0, vitest_1.expect)(response.body.live).toBe(true);
        });
    });
});
