"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const supertest_1 = __importDefault(require("supertest"));
const test_app_js_1 = require("./test-app.js");
globals_1.jest.mock('../../src/middleware/auth', () => ({
    ensureAuthenticated: (req, res, next) => {
        // Default to a non-admin user
        req.user = { id: 'user-123', tenantId: 'tenant-123', role: 'user' };
        next();
    },
    ensureRole: (role) => (req, res, next) => {
        if (req.user?.role !== role) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    },
}));
globals_1.jest.mock('../../src/temporal/control.js', () => ({
    enableTemporal: globals_1.jest.fn(),
    disableTemporal: globals_1.jest.fn(),
}));
(0, globals_1.describe)('AuthZ Regression Tests: Admin Routes', () => {
    (0, globals_1.it)('denies non-admin access to /admin/config', async () => {
        const res = await (0, supertest_1.default)(test_app_js_1.app).get('/admin/config');
        (0, globals_1.expect)(res.status).toBe(403);
        (0, globals_1.expect)(res.body.error).toBe('Forbidden');
    });
});
