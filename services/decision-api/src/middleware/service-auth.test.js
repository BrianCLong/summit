"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const service_auth_js_1 = require("./service-auth.js");
(0, vitest_1.describe)('service auth verification', () => {
    (0, vitest_1.it)('validates a trusted caller with required scopes', async () => {
        const token = await (0, service_auth_js_1.mintServiceToken)({
            audience: 'decision-api',
            serviceId: 'intelgraph-jobs',
            scopes: ['decision:write'],
        });
        const principal = await (0, service_auth_js_1.verifyServiceCaller)(token);
        (0, vitest_1.expect)(principal.serviceId).toBe('intelgraph-jobs');
        (0, vitest_1.expect)(principal.scopes).toContain('decision:write');
    });
    (0, vitest_1.it)('rejects missing scope', async () => {
        const token = await (0, service_auth_js_1.mintServiceToken)({
            audience: 'decision-api',
            serviceId: 'intelgraph-jobs',
            scopes: ['other:scope'],
        });
        await (0, vitest_1.expect)((0, service_auth_js_1.verifyServiceCaller)(token)).rejects.toThrow(/missing_scope:decision:write/);
    });
    (0, vitest_1.it)('rejects unknown service', async () => {
        const token = await (0, service_auth_js_1.mintServiceToken)({
            audience: 'decision-api',
            serviceId: 'rogue-service',
            scopes: ['decision:write'],
        });
        await (0, vitest_1.expect)((0, service_auth_js_1.verifyServiceCaller)(token)).rejects.toThrow(/unknown_service/);
    });
});
(0, vitest_1.describe)('service auth middleware', () => {
    const buildReply = () => {
        const status = vitest_1.vi.fn().mockReturnThis();
        const send = vitest_1.vi.fn();
        return { status, send };
    };
    (0, vitest_1.it)('attaches principal to the request', async () => {
        const token = await (0, service_auth_js_1.mintServiceToken)({
            audience: 'decision-api',
            serviceId: 'intelgraph-jobs',
            scopes: ['decision:write'],
        });
        const request = {
            url: '/api/v1/decisions',
            headers: { 'x-service-token': token },
            log: { info: vitest_1.vi.fn(), warn: vitest_1.vi.fn() },
        };
        const reply = buildReply();
        await (0, service_auth_js_1.serviceAuthMiddleware)(request, reply);
        (0, vitest_1.expect)(request.servicePrincipal?.serviceId).toBe('intelgraph-jobs');
        (0, vitest_1.expect)(reply.status).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('rejects invalid token', async () => {
        const request = {
            url: '/api/v1/decisions',
            headers: { 'x-service-token': 'bad-token' },
            log: { info: vitest_1.vi.fn(), warn: vitest_1.vi.fn() },
        };
        const reply = buildReply();
        await (0, service_auth_js_1.serviceAuthMiddleware)(request, reply);
        (0, vitest_1.expect)(reply.status).toHaveBeenCalledWith(403);
    });
});
