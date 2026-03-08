"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const globals_1 = require("@jest/globals");
const app_js_1 = require("../../../apps/api/src/app.js");
const rbac_manager_js_1 = require("../../../packages/authentication/src/rbac/rbac-manager.js");
(0, globals_1.describe)('Security Bypass Integration Tests', () => {
    let app;
    let rbacManager;
    (0, globals_1.beforeEach)(() => {
        rbacManager = new rbac_manager_js_1.RBACManager();
        app = (0, app_js_1.buildApp)({ rbacManager });
    });
    (0, globals_1.describe)('Authentication Enforcement (CN-001)', () => {
        (0, globals_1.it)('should reject requests without Authorization header or API key', async () => {
            const response = await (0, supertest_1.default)(app).get('/epics');
            (0, globals_1.expect)(response.status).toBe(401);
            (0, globals_1.expect)(response.body.error).toBe('unauthorized');
        });
        (0, globals_1.it)('should reject requests with invalid token format', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/epics')
                .set('Authorization', 'InvalidToken')
                .set('X-Tenant-ID', 'test-tenant');
            // If this passes (returns 200 or 404/403 but not 401), it's a bypass!
            // In our mock environment, /epics might return 404 or 200 depending on EpicService
            (0, globals_1.expect)(response.status).toBe(401);
        });
    });
    (0, globals_1.describe)('Tenant Isolation Enforcement (CN-003)', () => {
        (0, globals_1.it)('should reject authenticated requests without X-Tenant-ID header', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/epics')
                .set('Authorization', 'Bearer valid-token');
            // The current implementation in apps/api/src/middleware/security.ts
            // returns 400 if tenantId is missing in requireAuth
            (0, globals_1.expect)(response.status).toBe(400);
            (0, globals_1.expect)(response.body.error).toBe('tenant_context_required');
        });
        (0, globals_1.it)('should reject requests with invalid tenant ID format', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/epics')
                .set('Authorization', 'Bearer valid-token')
                .set('X-Tenant-ID', 'invalid!tenant@');
            (0, globals_1.expect)(response.status).toBe(400);
            (0, globals_1.expect)(response.body.error).toBe('invalid_tenant_id');
        });
    });
    (0, globals_1.describe)('Health Check (No Auth Required)', () => {
        (0, globals_1.it)('should allow access to /health without authentication', async () => {
            const response = await (0, supertest_1.default)(app).get('/health');
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.status).toBe('ok');
        });
    });
});
