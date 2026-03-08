"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const NormalizationService_js_1 = require("../ingestion/NormalizationService.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('NormalizationService', () => {
    (0, globals_1.it)('should normalize document records', async () => {
        const service = new NormalizationService_js_1.NormalizationService();
        const ctx = {
            tenantId: 'test-tenant',
            pipelineKey: 'test-pipeline',
            logger: console
        };
        const raw = [{ text: 'Hello World', title: 'Test Doc' }];
        const result = await service.normalize(raw, ctx);
        (0, globals_1.expect)(result.documents).toHaveLength(1);
        (0, globals_1.expect)(result.documents[0].title).toBe('Test Doc');
        (0, globals_1.expect)(result.documents[0].tenantId).toBe('test-tenant');
    });
    (0, globals_1.it)('should normalize entity records', async () => {
        const service = new NormalizationService_js_1.NormalizationService();
        const ctx = {
            tenantId: 'test-tenant',
            pipelineKey: 'test-pipeline',
            logger: console
        };
        const raw = [{ id: 'e1', type: 'person', labels: ['VIP'] }];
        const result = await service.normalize(raw, ctx);
        (0, globals_1.expect)(result.entities).toHaveLength(1);
        (0, globals_1.expect)(result.entities[0].id).toBe('e1');
        (0, globals_1.expect)(result.entities[0].kind).toBe('custom'); // Default fallback
    });
});
