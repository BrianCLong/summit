"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const ReportServiceV2_js_1 = require("../../services/reporting/ReportServiceV2.js");
(0, globals_1.describe)('ReportServiceV2', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        service = new ReportServiceV2_js_1.ReportServiceV2();
    });
    (0, globals_1.describe)('createReport', () => {
        (0, globals_1.it)('should block report without citations', async () => {
            const req = {
                title: 'Test',
                sections: [{ title: 'Body', content: 'Claim', type: 'text' }],
                citations: [] // Empty
            };
            await (0, globals_1.expect)(service.createReport(req)).rejects.toThrow('BLOCK: Publication blocked');
        });
        (0, globals_1.it)('should generate manifest for valid report', async () => {
            const req = {
                title: 'Test',
                sections: [{ title: 'Body', content: 'Claim', type: 'text' }],
                citations: [{ evidenceId: 'ev1', text: 'Proof' }],
                ch: ['H1', 'H2']
            };
            const result = await service.createReport(req);
            (0, globals_1.expect)(result.manifest).toBeDefined();
            (0, globals_1.expect)(result.report.sections.some((s) => s.title === 'Analysis of Competing Hypotheses')).toBe(true);
        });
    });
});
