"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const executor_js_1 = require("../executor.js");
(0, globals_1.describe)('PlaybookExecutor', () => {
    (0, globals_1.it)('executes steps in order', async () => {
        const order = [];
        const executor = new executor_js_1.PlaybookExecutor({
            log: async (step) => {
                order.push(step.id);
                return { message: step.message };
            },
            delay: async (step) => {
                order.push(step.id);
                return { durationMs: step.durationMs };
            },
        });
        const playbook = {
            id: 'pb-1',
            name: 'Sample',
            steps: [
                { id: 'step-1', type: 'log', message: 'hello' },
                { id: 'step-2', type: 'delay', durationMs: 5 },
            ],
        };
        const results = await executor.execute(playbook);
        (0, globals_1.expect)(order).toEqual(['step-1', 'step-2']);
        (0, globals_1.expect)(results).toHaveLength(2);
        (0, globals_1.expect)(results[0].status).toBe('success');
        (0, globals_1.expect)(results[1].status).toBe('success');
    });
});
