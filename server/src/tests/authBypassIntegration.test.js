"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const globals_1 = require("@jest/globals");
const express_1 = __importDefault(require("express"));
const auth_js_1 = require("../middleware/auth.js");
// Mock dependencies
globals_1.jest.mock('../db/postgres.js', () => ({
    getPostgresPool: globals_1.jest.fn(() => ({
        query: globals_1.jest.fn().mockResolvedValue({ rows: [] }),
    })),
}));
globals_1.jest.mock('../monitoring/metrics.js', () => ({
    metrics: { pbacDecisionsTotal: { inc: globals_1.jest.fn() } },
    httpRequestsTotal: { inc: globals_1.jest.fn() },
    httpRequestDuration: { startTimer: globals_1.jest.fn(() => globals_1.jest.fn()) }
}));
globals_1.jest.mock('../audit/advanced-audit-system.js', () => ({
    getAuditSystem: globals_1.jest.fn(() => ({
        recordEvent: globals_1.jest.fn().mockResolvedValue('test-event-id')
    }))
}));
// Mock AuthService using global strategy for consistent mocking
globals_1.jest.mock('../services/AuthService.js', () => {
    const mockService = {
        verifyToken: globals_1.jest.fn(),
        hasPermission: globals_1.jest.fn().mockReturnValue(true),
        formatUser: globals_1.jest.fn((u) => u)
    };
    const MockAuthService = globals_1.jest.fn(() => mockService);
    MockAuthService.getInstance = globals_1.jest.fn(() => mockService);
    global.mockAuthService = mockService;
    return {
        __esModule: true,
        default: MockAuthService
    };
});
const mockAuthService = global.mockAuthService;
(0, globals_1.describe)('Authentication Bypass Integration', () => {
    let app;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        // Setup protected route using just ensureAuthenticated
        app.get('/api/protected-resource', auth_js_1.ensureAuthenticated, (req, res) => {
            res.json({ message: 'Access granted', user: req.user });
        });
    });
    (0, globals_1.it)('rejects requests with no Authorization header', async () => {
        const response = await (0, supertest_1.default)(app).get('/api/protected-resource');
        (0, globals_1.expect)(response.status).toBe(401);
        (0, globals_1.expect)(response.body.error).toBe('No token provided');
    });
    (0, globals_1.it)('rejects requests with empty Authorization header', async () => {
        const response = await (0, supertest_1.default)(app)
            .get('/api/protected-resource')
            .set('Authorization', '');
        (0, globals_1.expect)(response.status).toBe(401);
    });
    (0, globals_1.it)('rejects requests with malformed Authorization header (missing Bearer)', async () => {
        const response = await (0, supertest_1.default)(app)
            .get('/api/protected-resource')
            .set('Authorization', 'InvalidFormatToken');
        (0, globals_1.expect)(response.status).toBe(401);
    });
    (0, globals_1.it)('rejects requests with invalid token (verifyToken returns null)', async () => {
        mockAuthService.verifyToken.mockResolvedValue(null);
        const response = await (0, supertest_1.default)(app)
            .get('/api/protected-resource')
            .set('Authorization', 'Bearer invalid-token');
        (0, globals_1.expect)(response.status).toBe(403);
        (0, globals_1.expect)(mockAuthService.verifyToken).toHaveBeenCalledWith('invalid-token');
    });
    (0, globals_1.it)('rejects requests when verifyToken throws error', async () => {
        mockAuthService.verifyToken.mockRejectedValue(new Error('Token expired'));
        const response = await (0, supertest_1.default)(app)
            .get('/api/protected-resource')
            .set('Authorization', 'Bearer expired-token');
        (0, globals_1.expect)(response.status).toBe(403);
    });
    (0, globals_1.it)('allows access with valid token', async () => {
        const mockUser = { id: 'user-1', roles: ['USER'] };
        mockAuthService.verifyToken.mockResolvedValue(mockUser);
        const response = await (0, supertest_1.default)(app)
            .get('/api/protected-resource')
            .set('Authorization', 'Bearer valid-token');
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body.message).toBe('Access granted');
        (0, globals_1.expect)(response.body.user).toEqual(mockUser);
    });
});
