"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const handlers_js_1 = require("../handlers.js");
const diffusion_coder_js_1 = require("../adapters/diffusion_coder.js");
(0, globals_1.describe)('Diffusion Edit Flow (Functional)', () => {
    let handlers;
    let mockEngine;
    let mockAgentService;
    let mockLLM;
    let mockGraph;
    let diffusionCoder;
    (0, globals_1.beforeEach)(() => {
        mockEngine = {
            registerTaskHandler: globals_1.jest.fn(),
            createRun: globals_1.jest.fn()
        };
        mockAgentService = {
            getAgent: globals_1.jest.fn()
        };
        mockLLM = {
            callCompletion: globals_1.jest.fn().mockResolvedValue({
                content: 'export function fix() { return true; }',
                usage: { total_tokens: 50 }
            })
        };
        mockGraph = {
            executeAlgorithm: globals_1.jest.fn()
        };
        diffusionCoder = new diffusion_coder_js_1.DiffusionCoderAdapter(mockLLM);
        handlers = new handlers_js_1.MaestroHandlers(mockEngine, mockAgentService, mockLLM, mockGraph, diffusionCoder);
    });
    (0, globals_1.it)('should register diffusion_edit handler', () => {
        handlers.registerAll();
        (0, globals_1.expect)(mockEngine.registerTaskHandler).toHaveBeenCalledWith('diffusion_edit', globals_1.expect.any(Function));
    });
    (0, globals_1.it)('should execute functional diffusion edit and call LLM for each step and block', async () => {
        const task = {
            id: 'task-123',
            runId: 'run-456',
            tenantId: 'tenant-789',
            name: 'Fix bug',
            kind: 'diffusion_edit',
            status: 'running',
            dependsOn: [],
            attempt: 1,
            maxAttempts: 3,
            backoffStrategy: 'fixed',
            payload: {
                prompt: 'Fix the null pointer exception in user service',
                steps: 2,
                block_length: 2
            },
            metadata: {}
        };
        handlers.registerAll();
        const handler = mockEngine.registerTaskHandler.mock.calls.find(call => call[0] === 'diffusion_edit')[1];
        const result = await handler(task);
        (0, globals_1.expect)(result).toBeDefined();
        (0, globals_1.expect)(result.patch).toContain('fix');
        (0, globals_1.expect)(mockLLM.callCompletion).toHaveBeenCalled();
        // 2 steps * 2 blocks = 4 calls
        (0, globals_1.expect)(mockLLM.callCompletion).toHaveBeenCalledTimes(4);
        (0, globals_1.expect)(result.uncertaintyMap).toBeDefined();
        (0, globals_1.expect)(result.policyVerdicts).toBeDefined();
        (0, globals_1.expect)(result.policyVerdicts.length).toBeGreaterThanOrEqual(4);
        (0, globals_1.expect)(result.stats.llmCalls).toBe(4);
    });
});
