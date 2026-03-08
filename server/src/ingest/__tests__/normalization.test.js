"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const normalization_js_1 = require("../stages/normalization.js");
const mockLogger = {
    info: globals_1.jest.fn(),
    error: globals_1.jest.fn(),
    child: globals_1.jest.fn(() => mockLogger),
};
(0, globals_1.describe)('NormalizationStage', () => {
    let ctx;
    (0, globals_1.beforeEach)(() => {
        ctx = {
            pipeline: {
                key: 'test-pipe',
                tenantId: 't1',
                name: 'Test',
                source: { type: 'api', config: {} },
                stages: ['normalize'],
            },
            runId: 'run1',
            tenantId: 't1',
            logger: mockLogger,
        };
    });
    (0, globals_1.it)('should normalize documents', async () => {
        const stage = new normalization_js_1.NormalizationStage({});
        const input = [{ text: 'Hello world', id: 'doc1', title: 'My Doc' }];
        const output = await stage.process(ctx, input);
        (0, globals_1.expect)(output).toHaveLength(1);
        (0, globals_1.expect)(output[0]).toMatchObject({
            tenantId: 't1',
            text: 'Hello world',
            title: 'My Doc',
        });
        (0, globals_1.expect)(output[0].source.id).toBe('doc1');
    });
    (0, globals_1.it)('should normalize entities', async () => {
        const stage = new normalization_js_1.NormalizationStage({ entityType: 'person' });
        const input = [{ name: 'Alice', age: 30 }];
        const output = await stage.process(ctx, input);
        (0, globals_1.expect)(output).toHaveLength(1);
        (0, globals_1.expect)(output[0]).toMatchObject({
            tenantId: 't1',
            kind: 'person',
            properties: { name: 'Alice', age: 30 }
        });
    });
});
