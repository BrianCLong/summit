"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("../src/app");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('Personal Agent API', () => {
    let app;
    (0, globals_1.beforeAll)(async () => {
        app = await (0, app_1.buildApp)();
    });
    (0, globals_1.it)('should return health status', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/healthz'
        });
        (0, globals_1.expect)(response.statusCode).toBe(200);
        (0, globals_1.expect)(response.json()).toEqual({ status: 'ok' });
    });
    (0, globals_1.it)('should queue an agent run with envelope', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/agent/run',
            payload: {
                meta: {
                    schema: "https://summit.dev/schemas/envelope.v0.1.json",
                    tenant_id: "t_123",
                    correlation_id: "c_abc",
                    ts: new Date().toISOString()
                },
                payload: {
                    type: 'alert_triage',
                    input_ref: { kind: 'alert', id: 'alert_123' },
                    constraints: { mode: 'assist' }
                }
            }
        });
        (0, globals_1.expect)(response.statusCode).toBe(200);
        const body = response.json();
        (0, globals_1.expect)(body).toHaveProperty('run_id');
        (0, globals_1.expect)(body.status).toBe('queued');
        (0, globals_1.expect)(body.meta.tenant_id).toBe('t_123');
    });
    (0, globals_1.it)('should queue a playbook run with envelope', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/agent/run-playbook',
            payload: {
                meta: {
                    schema: "https://summit.dev/schemas/envelope.v0.1.json",
                    tenant_id: "t_456",
                    correlation_id: "c_def",
                    ts: new Date().toISOString()
                },
                payload: {
                    playbook: 'phishing_triage_v2',
                    params: { alert_id: 'alert_123' }
                }
            }
        });
        (0, globals_1.expect)(response.statusCode).toBe(200);
        const body = response.json();
        (0, globals_1.expect)(body).toHaveProperty('run_id');
        (0, globals_1.expect)(body.meta.tenant_id).toBe('t_456');
    });
    (0, globals_1.it)('should fetch run details', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/runs/run_test_123'
        });
        (0, globals_1.expect)(response.statusCode).toBe(200);
        const body = response.json();
        (0, globals_1.expect)(body.run_id).toBe('run_test_123');
        (0, globals_1.expect)(body.status).toBe('completed');
    });
});
