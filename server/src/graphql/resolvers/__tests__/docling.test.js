"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const docling_js_1 = require("../docling.js");
const DoclingService_js_1 = require("../../../services/DoclingService.js");
const doclingRepository_js_1 = require("../../../db/repositories/doclingRepository.js");
(0, globals_1.describe)('docling resolvers', () => {
    const ctx = { user: { tenantId: 'tenant-1' } };
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.resetAllMocks();
    });
    (0, globals_1.it)('calls service for summarizeBuildFailure', async () => {
        DoclingService_js_1.doclingService.summarizeBuildFailure.mockResolvedValue({
            summary: {
                id: 's1',
                text: 'ok',
                focus: 'failures',
                highlights: [],
                qualitySignals: {},
            },
            fragments: [{ id: 'f1', sha256: 'abc', text: 'fragment', metadata: {} }],
            findings: [],
            policySignals: [],
        });
        const result = await docling_js_1.doclingResolvers.Mutation.summarizeBuildFailure({}, {
            input: {
                requestId: 'req-12345',
                buildId: 'build-1',
                logText: 'fail',
                retention: 'SHORT',
                purpose: 'investigation',
            },
        }, ctx);
        (0, globals_1.expect)(DoclingService_js_1.doclingService.summarizeBuildFailure).toHaveBeenCalledWith(globals_1.expect.objectContaining({ tenantId: 'tenant-1', retention: 'short' }));
        (0, globals_1.expect)(result.summary.id).toBe('s1');
    });
    (0, globals_1.it)('fetches stored summary', async () => {
        doclingRepository_js_1.doclingRepository.findSummaryByRequestId.mockResolvedValue({
            id: 'sum-1',
            tenantId: 'tenant-1',
            requestId: 'req-12345',
            scope: 'BUILD',
            focus: 'failures',
            text: 'summary',
            highlights: ['h1'],
            qualitySignals: { heuristic: true },
            createdAt: new Date(),
        });
        const summary = await docling_js_1.doclingResolvers.Query.doclingSummary({}, { requestId: 'req-12345' }, ctx);
        (0, globals_1.expect)(summary).toEqual({
            id: 'sum-1',
            text: 'summary',
            focus: 'failures',
            highlights: ['h1'],
            qualitySignals: { heuristic: true },
        });
    });
});
