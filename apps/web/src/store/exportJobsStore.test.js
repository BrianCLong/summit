"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const exportJobsStore_1 = require("./exportJobsStore");
const tenantId = 'tenant-a';
const caseId = 'case-1';
const paramsHash = 'hash-1';
const setJobStatus = (status) => {
    exportJobsStore_1.useExportJobsStore.setState((state) => {
        const job = Object.values(state.jobs)[0];
        if (!job)
            return state;
        return {
            jobs: {
                ...state.jobs,
                [Object.keys(state.jobs)[0]]: {
                    ...job,
                    status,
                },
            },
        };
    });
};
(0, vitest_1.describe)('exportJobsStore', () => {
    (0, vitest_1.it)('creates and updates a job lifecycle', () => {
        const job = (0, exportJobsStore_1.createJobEntry)({ tenantId, caseId, paramsHash, jobId: 'job-1', idempotencyKey: 'key-1' });
        const key = `${tenantId}::${caseId}::${paramsHash}`;
        exportJobsStore_1.useExportJobsStore.getState().upsertJob(key, job);
        (0, vitest_1.expect)(exportJobsStore_1.useExportJobsStore.getState().jobs[key].status).toBe('creating');
        setJobStatus('in_progress');
        (0, vitest_1.expect)(exportJobsStore_1.useExportJobsStore.getState().jobs[key].status).toBe('in_progress');
        exportJobsStore_1.useExportJobsStore.getState().updateStatus(key, 'ready', { progress: 100, downloadUrl: 'http://example.com' });
        (0, vitest_1.expect)(exportJobsStore_1.useExportJobsStore.getState().jobs[key].status).toBe('ready');
        (0, vitest_1.expect)(exportJobsStore_1.useExportJobsStore.getState().jobs[key].progress).toBe(100);
        exportJobsStore_1.useExportJobsStore.getState().updateStatus(key, 'complete');
        (0, vitest_1.expect)(exportJobsStore_1.useExportJobsStore.getState().jobs[key].status).toBe('complete');
    });
    (0, vitest_1.it)('dedupes jobs by key', () => {
        const jobA = (0, exportJobsStore_1.createJobEntry)({ tenantId, caseId, paramsHash, jobId: 'job-dedupe', idempotencyKey: 'key-a' });
        const key = `${tenantId}::${caseId}::${paramsHash}`;
        exportJobsStore_1.useExportJobsStore.getState().upsertJob(key, jobA);
        const jobB = (0, exportJobsStore_1.createJobEntry)({ tenantId, caseId, paramsHash, jobId: 'job-dedupe', idempotencyKey: 'key-b' });
        exportJobsStore_1.useExportJobsStore.getState().upsertJob(key, jobB);
        (0, vitest_1.expect)(Object.keys(exportJobsStore_1.useExportJobsStore.getState().jobs)).toHaveLength(1);
        (0, vitest_1.expect)(exportJobsStore_1.useExportJobsStore.getState().jobs[key].jobId).toBe('job-dedupe');
        (0, vitest_1.expect)(exportJobsStore_1.useExportJobsStore.getState().jobs[key].idempotencyKey).toBe('key-b');
    });
});
