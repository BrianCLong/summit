"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
(0, test_1.test)('runRecipe dry-run → PLANNED', async () => {
    const api = await test_1.request.newContext();
    const mutation = `mutation($name:String!,$inputs:JSON,$meta:SafeMeta!){ runRecipe(name:$name, inputs:$inputs, meta:$meta){ status auditId diff } }`;
    const res = await api.post('http://localhost:4000/graphql', {
        data: {
            query: mutation,
            variables: {
                name: 'rag-qa.yaml',
                inputs: { query: 'hello' },
                meta: { idempotencyKey: 'test-1', dryRun: true, reason: 'e2e' },
            },
        },
    });
    (0, test_1.expect)(res.ok()).toBeTruthy();
    const body = await res.json();
    (0, test_1.expect)(body?.data?.runRecipe?.status).toBe('PLANNED');
    (0, test_1.expect)(body?.data?.runRecipe?.auditId).toBeTruthy();
});
