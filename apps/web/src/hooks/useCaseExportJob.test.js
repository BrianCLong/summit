"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
const vitest_1 = require("vitest");
const useCaseExportJob_1 = require("./useCaseExportJob");
const baseJob = {
    jobId: 'job-1',
    tenantId: 'tenant-1',
    caseId: 'case-1',
    paramsHash: 'hash-1',
    idempotencyKey: 'key-1',
    status: 'in_progress',
    progress: 45,
    startedAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
};
(0, vitest_1.describe)('normalizeExportJobStatus', () => {
    (0, vitest_1.it)('continues polling when completed without download url', () => {
        const normalized = (0, useCaseExportJob_1.normalizeExportJobStatus)({
            id: baseJob.jobId,
            status: 'completed',
            progress: 100,
        }, baseJob);
        (0, vitest_1.expect)(normalized.lifecycle).toBe('in_progress');
        (0, vitest_1.expect)(normalized.isTerminal).toBe(false);
        (0, vitest_1.expect)(normalized.progress).toBe(100);
    });
    (0, vitest_1.it)('marks ready only when a download url is present', () => {
        const normalized = (0, useCaseExportJob_1.normalizeExportJobStatus)({
            id: baseJob.jobId,
            status: 'completed',
            progress: 100,
            downloadUrl: 'https://example.com/file.pdf',
        }, baseJob);
        (0, vitest_1.expect)(normalized.lifecycle).toBe('ready');
        (0, vitest_1.expect)(normalized.isTerminal).toBe(true);
        (0, vitest_1.expect)(normalized.downloadUrl).toContain('file.pdf');
    });
    (0, vitest_1.it)('reuses previous progress when missing', () => {
        const normalized = (0, useCaseExportJob_1.normalizeExportJobStatus)({
            id: baseJob.jobId,
            status: 'running',
        }, baseJob);
        (0, vitest_1.expect)(normalized.progress).toBe(baseJob.progress);
        (0, vitest_1.expect)(normalized.isTerminal).toBe(false);
        (0, vitest_1.expect)(normalized.lifecycle).toBe('in_progress');
    });
});
