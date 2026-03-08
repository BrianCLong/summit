"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const server_js_1 = require("../../src/server.js");
const config_js_1 = require("../../src/config.js");
const db_js_1 = require("../../src/db.js");
const memory_db_js_1 = require("../helpers/memory-db.js");
const bootstrapServer = async () => {
    const { pool } = (0, memory_db_js_1.createMemoryPool)();
    await (0, db_js_1.initSchema)(pool);
    const config = (0, config_js_1.loadConfig)();
    config.residencyAllowList = ['US'];
    config.licenseAllowList = ['ITAR'];
    const app = (0, server_js_1.createApp)({ pool, config });
    const server = app.listen(0);
    const port = server.address().port;
    const context = await test_1.request.newContext({ baseURL: `http://127.0.0.1:${port}` });
    return { pool, server, port, context };
};
(0, test_1.test)('apply→blocked export→approved downgrade→export', async () => {
    const { server, context } = await bootstrapServer();
    try {
        await context.post('/taxonomy/seed');
        const documentId = '00000000-0000-0000-0000-000000000001';
        const createResponse = await context.post('/documents', {
            data: {
                id: documentId,
                title: 'Sensitive dossier',
                classificationCode: 'S',
                residency: 'US',
                license: 'ITAR',
                derivedFrom: true,
                actor: 'operator'
            }
        });
        (0, test_1.expect)(createResponse.ok()).toBeTruthy();
        const exportBlocked = await context.post(`/export/${documentId}`);
        (0, test_1.expect)(exportBlocked.status()).toBe(200);
        const blockedResult = await exportBlocked.json();
        (0, test_1.expect)(blockedResult.allowed).toBe(false);
        const requestResponse = await context.post('/downgrade/requests', {
            data: {
                documentId,
                requestedCode: 'U',
                justification: 'Need for external sharing',
                actor: 'operator'
            }
        });
        (0, test_1.expect)(requestResponse.ok()).toBeTruthy();
        const { id } = await requestResponse.json();
        const firstApproval = await context.post('/downgrade/approve', {
            data: { requestId: id, approver: 'approver-1' }
        });
        (0, test_1.expect)((await firstApproval.json()).status).toBe('waiting_second_approval');
        const secondApproval = await context.post('/downgrade/approve', {
            data: { requestId: id, approver: 'approver-2' }
        });
        (0, test_1.expect)((await secondApproval.json()).status).toBe('approved');
        const exportAllowed = await context.post(`/export/${documentId}`);
        const allowedResult = await exportAllowed.json();
        (0, test_1.expect)(allowedResult.allowed).toBe(true);
    }
    finally {
        await context.dispose();
        server.close();
    }
});
