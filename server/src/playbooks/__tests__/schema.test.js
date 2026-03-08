"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const schema_js_1 = require("../schema.js");
(0, globals_1.describe)('Playbook schema', () => {
    (0, globals_1.it)('accepts a valid playbook', () => {
        const result = schema_js_1.PlaybookSchema.safeParse({
            id: 'pb-1',
            name: 'Sample',
            steps: [
                { id: 'step-1', type: 'log', message: 'hello' },
                { id: 'step-2', type: 'delay', durationMs: 10 },
            ],
        });
        (0, globals_1.expect)(result.success).toBe(true);
    });
    (0, globals_1.it)('rejects invalid steps', () => {
        const result = schema_js_1.PlaybookSchema.safeParse({
            id: 'pb-1',
            name: 'Sample',
            steps: [{ id: 'step-1', type: 'unknown' }],
        });
        (0, globals_1.expect)(result.success).toBe(false);
    });
    (0, globals_1.it)('requires a run key for playbook runs', () => {
        const result = schema_js_1.PlaybookRunSchema.safeParse({
            playbook: {
                id: 'pb-1',
                name: 'Sample',
                steps: [{ id: 'step-1', type: 'log', message: 'hello' }],
            },
        });
        (0, globals_1.expect)(result.success).toBe(false);
    });
});
