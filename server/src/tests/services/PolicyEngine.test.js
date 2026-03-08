"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PolicyEngine_js_1 = require("../../services/PolicyEngine.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('PolicyEngine', () => {
    let engine;
    (0, globals_1.beforeAll)(async () => {
        engine = PolicyEngine_js_1.PolicyEngine.getInstance();
        await engine.initialize();
    });
    (0, globals_1.it)('should allow admin users', async () => {
        const decision = await engine.evaluate({
            environment: 'prod',
            user: { id: 'u1', role: 'admin', permissions: [], tenantId: 't1' },
            action: 'delete_db',
            resource: { type: 'database' }
        });
        (0, globals_1.expect)(decision.allow).toBe(true);
        (0, globals_1.expect)(decision.reason).toBe('Admin bypass');
    });
    (0, globals_1.it)('should block TOP_SECRET access for low clearance', async () => {
        const decision = await engine.evaluate({
            environment: 'prod',
            user: { id: 'u2', role: 'user', permissions: [], clearance_level: 1, tenantId: 't1' },
            action: 'read',
            resource: { type: 'document', sensitivity: 'TOP_SECRET' }
        });
        (0, globals_1.expect)(decision.allow).toBe(false);
        (0, globals_1.expect)(decision.reason).toContain('Insufficient clearance');
    });
    (0, globals_1.it)('should detect PII in copilot query', async () => {
        const decision = await engine.evaluate({
            environment: 'prod',
            user: { id: 'u3', role: 'user', permissions: ['copilot_query'], tenantId: 't1' },
            action: 'copilot_query',
            resource: { type: 'prompt', query: 'Show me the SSN for user X' }
        });
        (0, globals_1.expect)(decision.allow).toBe(false);
        (0, globals_1.expect)(decision.reason).toContain('PII detected');
    });
});
