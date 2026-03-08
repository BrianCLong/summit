"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const core_1 = require("../../src/maestro/core");
const client_1 = require("../../src/intelgraph/client");
const cost_meter_1 = require("../../src/maestro/cost_meter");
const llm_openai_1 = require("../../src/maestro/adapters/llm_openai");
(0, globals_1.describe)('Maestro Core', () => {
    let maestro;
    let ig;
    let costMeter;
    let llm;
    (0, globals_1.beforeEach)(() => {
        ig = new client_1.IntelGraphClientImpl();
        costMeter = new cost_meter_1.CostMeter(ig, {
            'openai:gpt-4.1': { inputPer1K: 0.03, outputPer1K: 0.06 },
            'openai:gpt-4.1-mini': { inputPer1K: 0.01, outputPer1K: 0.02 },
        });
        llm = new llm_openai_1.OpenAILLM('test-key', costMeter);
        maestro = new core_1.Maestro(ig, costMeter, llm, {
            defaultPlannerAgent: 'openai:gpt-4.1',
            defaultActionAgent: 'openai:gpt-4.1-mini',
        });
    });
    (0, globals_1.it)('should create a run', async () => {
        const run = await maestro.createRun('user-1', 'test request');
        (0, globals_1.expect)(run.id).toBeDefined();
        (0, globals_1.expect)(run.user.id).toBe('user-1');
        (0, globals_1.expect)(run.requestText).toBe('test request');
    });
    (0, globals_1.it)('should plan a request', async () => {
        const run = await maestro.createRun('user-1', 'test request');
        const tasks = await maestro.planRequest(run);
        (0, globals_1.expect)(tasks).toHaveLength(2);
        (0, globals_1.expect)(tasks[0].kind).toBe('plan');
        (0, globals_1.expect)(tasks[1].kind).toBe('action');
        (0, globals_1.expect)(tasks[1].parentTaskId).toBe(tasks[0].id);
    });
    (0, globals_1.it)('should run a full pipeline', async () => {
        const result = await maestro.runPipeline('user-1', 'test request');
        (0, globals_1.expect)(result.run).toBeDefined();
        (0, globals_1.expect)(result.tasks).toHaveLength(2);
        (0, globals_1.expect)(result.results).toHaveLength(1); // Only executable tasks (action)
        (0, globals_1.expect)(result.results[0].task.status).toBe('succeeded');
        (0, globals_1.expect)(result.results[0].artifact).toBeDefined();
        (0, globals_1.expect)(result.costSummary).toBeDefined();
    });
});
