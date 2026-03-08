"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const ReportServiceV2_js_1 = require("../ReportServiceV2.js");
const types_js_1 = require("../../graphrag/types.js");
(0, globals_1.describe)('ReportServiceV2 citation gate', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        service = new ReportServiceV2_js_1.ReportServiceV2();
        process.env.CITATION_GATE = '1';
    });
    (0, globals_1.afterEach)(() => {
        process.env.CITATION_GATE = undefined;
    });
    (0, globals_1.it)('allows publish when citations present', async () => {
        const result = await service.createReport({
            title: 'Test Report',
            sections: [],
            citations: [{ evidenceId: 'ev-1', text: 'evidence text' }],
        });
        (0, globals_1.expect)(result.report.title).toBe('Test Report');
        (0, globals_1.expect)(result.manifest.evidenceHashes['ev-1']).toBeDefined();
    });
    (0, globals_1.it)('blocks publish with missing citations', async () => {
        await (0, globals_1.expect)(service.createReport({
            title: 'Missing citations',
            sections: [],
            citations: [],
        })).rejects.toBeInstanceOf(types_js_1.CitationValidationError);
    });
    (0, globals_1.it)('blocks publish with unresolved citations', async () => {
        await (0, globals_1.expect)(service.createReport({
            title: 'Dangling citations',
            sections: [],
            citations: [{ evidenceId: '', text: '' }],
        })).rejects.toBeInstanceOf(types_js_1.CitationValidationError);
    });
});
