"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const gql = async (baseURL, body) => {
    const rsp = await fetch(new URL('/api/graphql', baseURL).toString(), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    });
    const json = await rsp.json();
    return { ok: rsp.ok, json };
};
test_1.test.describe('Policy gates', () => {
    (0, test_1.test)('startRun dryRun=true -> PLANNED', async ({ baseURL }) => {
        const query = `mutation($i: StartRunInput!) { startRun(input:$i){ status } }`;
        const variables = {
            i: {
                pipelineId: 'policy-pipe',
                parameters: { TAG: 'e2e' },
                canaryPercent: 5,
                maxParallel: 1,
                meta: {
                    idempotencyKey: `pol-${Date.now()}`,
                    dryRun: true,
                    reason: 'policy test',
                },
            },
        };
        const { ok, json } = await gql(baseURL, { query, variables });
        (0, test_1.expect)(ok).toBeTruthy();
        (0, test_1.expect)(json.data.startRun.status).toBe('PLANNED');
    });
    (0, test_1.test)('startRun dryRun=false -> BLOCKED_BY_POLICY or QUEUED', async ({ baseURL, }) => {
        const query = `mutation($i: StartRunInput!) { startRun(input:$i){ status } }`;
        const variables = {
            i: {
                pipelineId: 'policy-pipe',
                parameters: { TAG: 'e2e' },
                canaryPercent: 5,
                maxParallel: 1,
                meta: {
                    idempotencyKey: `pol-${Date.now()}`,
                    dryRun: false,
                    reason: 'policy test',
                },
            },
        };
        const { ok, json } = await gql(baseURL, { query, variables });
        (0, test_1.expect)(ok).toBeTruthy();
        const status = json.data.startRun.status;
        test_1.test
            .info()
            .annotations.push({ type: 'policy-status', description: status });
        (0, test_1.expect)(['BLOCKED_BY_POLICY', 'QUEUED']).toContain(status);
    });
});
