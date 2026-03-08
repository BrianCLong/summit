"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const jobs_js_1 = require("../../src/db/repositories/jobs.js");
(0, globals_1.describe)('JobsRepo tenant partitioning', () => {
    const buildRepo = () => {
        const queries = [];
        const client = {
            query: globals_1.jest.fn(async (text, params) => {
                queries.push({ text, params });
                return { rows: [{ id: 'job-1', tenant_id: 'tenant-a' }] };
            }),
            release: globals_1.jest.fn(),
        };
        const pool = {
            connect: globals_1.jest.fn(async () => client),
        };
        return { repo: new jobs_js_1.JobsRepo(pool), queries, client, pool };
    };
    (0, globals_1.it)('scopes inserts and reads by tenant with session context', async () => {
        const { repo, queries } = buildRepo();
        await repo.insert('tenant-a', {
            id: 'job-1',
            kind: 'embedding',
            status: 'queued',
            createdAt: new Date().toISOString(),
            meta: {},
        });
        await repo.findById('tenant-a', 'job-1');
        (0, globals_1.expect)(queries[0].text).toContain('SET LOCAL app.current_tenant');
        (0, globals_1.expect)(queries.find((q) => q.text.includes('INSERT INTO ai_jobs'))).toBeTruthy();
        const selectQuery = queries.find((q) => q.text.includes('SELECT * FROM ai_jobs'));
        (0, globals_1.expect)(selectQuery?.params).toContain('tenant-a');
    });
});
