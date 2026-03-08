"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("../src/app");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('Maestro Orchestrator', () => {
    let app;
    (0, globals_1.beforeAll)(async () => {
        app = await (0, app_1.buildApp)();
    });
    (0, globals_1.it)('should orchestrate alert_triage', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/orchestrate',
            payload: {
                run_id: 'run_123',
                payload: {
                    type: 'alert_triage',
                    constraints: { mode: 'assist' }
                }
            }
        });
        (0, globals_1.expect)(response.statusCode).toBe(200);
        const body = response.json();
        (0, globals_1.expect)(body.run_id).toBe('run_123');
        (0, globals_1.expect)(body.status).toBe('orchestrating');
        (0, globals_1.expect)(body.requires_hitl).toBe(false);
    });
    (0, globals_1.it)('should deny non-alert_triage types', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/orchestrate',
            payload: {
                payload: {
                    type: 'unknown_type'
                }
            }
        });
        (0, globals_1.expect)(response.statusCode).toBe(403);
        (0, globals_1.expect)(response.json().error).toBe('Policy Denied');
    });
    (0, globals_1.it)('should flag HITL for autopilot', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/orchestrate',
            payload: {
                payload: {
                    type: 'alert_triage',
                    constraints: { mode: 'autopilot' }
                }
            }
        });
        (0, globals_1.expect)(response.statusCode).toBe(200);
        (0, globals_1.expect)(response.json().requires_hitl).toBe(true);
    });
});
