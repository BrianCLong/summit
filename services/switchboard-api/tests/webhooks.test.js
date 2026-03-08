"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("../src/app");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('Switchboard Webhooks', () => {
    let app;
    (0, globals_1.beforeAll)(async () => {
        app = await (0, app_1.buildApp)();
    });
    (0, globals_1.it)('should normalize Splunk alert', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/webhooks/splunk',
            payload: {
                sid: 'splunk_123',
                search_name: 'High CPU Usage',
                result: {
                    severity: 'high',
                    host: 'prod-web-01'
                }
            }
        });
        (0, globals_1.expect)(response.statusCode).toBe(200);
        const body = response.json();
        (0, globals_1.expect)(body.status).toBe('accepted');
        (0, globals_1.expect)(body.alert_id).toBe('splunk_123');
    });
});
