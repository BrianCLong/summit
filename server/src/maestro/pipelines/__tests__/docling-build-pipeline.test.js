"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const docling_build_pipeline_js_1 = require("../docling-build-pipeline.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('DoclingBuildPipeline', () => {
    const service = {
        summarizeBuildFailure: globals_1.jest.fn().mockResolvedValue({
            summary: { id: 's1' },
            fragments: [],
            findings: [],
            policySignals: [],
        }),
        extractLicenses: globals_1.jest
            .fn()
            .mockResolvedValue({ findings: [], policySignals: [] }),
        generateReleaseNotes: globals_1.jest
            .fn()
            .mockResolvedValue({ summary: { id: 'rn1' } }),
    };
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.it)('runs all stages when all artifacts provided', async () => {
        const pipeline = new docling_build_pipeline_js_1.DoclingBuildPipeline(service);
        await pipeline.execute({
            tenantId: 'tenant-x',
            buildId: 'build-1',
            requestId: 'req-12345',
            logText: 'build failed',
            sbomText: 'license: MIT',
            diffText: 'feat: add new feature',
            retention: 'short',
            purpose: 'investigation',
        });
        (0, globals_1.expect)(service.summarizeBuildFailure).toHaveBeenCalled();
        (0, globals_1.expect)(service.extractLicenses).toHaveBeenCalled();
        (0, globals_1.expect)(service.generateReleaseNotes).toHaveBeenCalled();
    });
    (0, globals_1.it)('skips optional stages when artifacts absent', async () => {
        const pipeline = new docling_build_pipeline_js_1.DoclingBuildPipeline(service);
        await pipeline.execute({
            tenantId: 'tenant-x',
            buildId: 'build-1',
            logText: 'build ok',
            retention: 'standard',
            purpose: 'compliance',
        });
        (0, globals_1.expect)(service.extractLicenses).not.toHaveBeenCalled();
        (0, globals_1.expect)(service.generateReleaseNotes).not.toHaveBeenCalled();
    });
});
