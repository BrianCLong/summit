"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const opa_client_js_1 = require("../opa-client.js"); // Mocked
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('GraphQL Policy Contract Tests', () => {
    const opaClient = new opa_client_js_1.OPAClient();
    (0, globals_1.it)("should DENY access when a user queries for another tenant's data", async () => {
        const input = {
            principal: { tenant_id: 'tenant-a' },
            resource: { tenant_id: 'tenant-b' },
        };
        const decision = await opaClient.query(input);
        (0, globals_1.expect)(decision.allow).toBe(false);
    });
    (0, globals_1.it)("should ALLOW access when a user queries for their own tenant's data", async () => {
        const input = {
            principal: { tenant_id: 'tenant-a' },
            resource: { tenant_id: 'tenant-a' },
        };
        const decision = await opaClient.query(input);
        (0, globals_1.expect)(decision.allow).toBe(true);
    });
});
