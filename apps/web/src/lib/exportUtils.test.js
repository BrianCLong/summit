"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const exportUtils_1 = require("./exportUtils");
(0, vitest_1.describe)('computeExportParamsHash', () => {
    const baseOptions = {
        includeTimeline: true,
        includeGraphSnapshot: true,
        includeSources: true,
    };
    (0, vitest_1.it)('includes tenant and case identifiers', () => {
        const first = (0, exportUtils_1.computeExportParamsHash)({
            tenantId: 'tenant-a',
            caseId: 'case-1',
            format: 'pdf',
            options: baseOptions,
        });
        const second = (0, exportUtils_1.computeExportParamsHash)({
            tenantId: 'tenant-b',
            caseId: 'case-1',
            format: 'pdf',
            options: baseOptions,
        });
        (0, vitest_1.expect)(first).not.toEqual(second);
    });
    (0, vitest_1.it)('is stable regardless of option ordering', () => {
        const hashA = (0, exportUtils_1.computeExportParamsHash)({
            tenantId: 'tenant-a',
            caseId: 'case-1',
            format: 'zip',
            options: baseOptions,
        });
        const reordered = {
            includeSources: baseOptions.includeSources,
            includeGraphSnapshot: baseOptions.includeGraphSnapshot,
            includeTimeline: baseOptions.includeTimeline,
        };
        const hashB = (0, exportUtils_1.computeExportParamsHash)({
            tenantId: 'tenant-a',
            caseId: 'case-1',
            format: 'zip',
            options: reordered,
        });
        (0, vitest_1.expect)(hashA).toEqual(hashB);
    });
});
(0, vitest_1.describe)('buildExportKey', () => {
    (0, vitest_1.it)('composes tenant, case, and hash', () => {
        const key = (0, exportUtils_1.buildExportKey)('tenant-1', 'case-9', 'abc123');
        (0, vitest_1.expect)(key).toBe('tenant-1::case-9::abc123');
    });
});
(0, vitest_1.describe)('deriveIdempotencyKey', () => {
    (0, vitest_1.it)('uses salt to generate a unique key', () => {
        const base = (0, exportUtils_1.deriveIdempotencyKey)('tenant', 'case', 'hash');
        const salted = (0, exportUtils_1.deriveIdempotencyKey)('tenant', 'case', 'hash', 'salt');
        (0, vitest_1.expect)(base).toBe('tenant-case-hash');
        (0, vitest_1.expect)(salted).toBe('tenant-case-hash-salt');
    });
});
