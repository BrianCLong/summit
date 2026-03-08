"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const core_js_1 = require("../core.js");
(0, globals_1.describe)('Maestro Orchestration Core', () => {
    let mockIg;
    let mockCostMeter;
    let mockLlm;
    let maestro;
    (0, globals_1.beforeEach)(() => {
        mockIg = {
            createRun: globals_1.jest.fn(),
            createTask: globals_1.jest.fn(),
            updateTask: globals_1.jest.fn(),
            createArtifact: globals_1.jest.fn(),
        };
        mockCostMeter = {
            summarize: globals_1.jest.fn(),
        };
        mockLlm = {
            callCompletion: globals_1.jest.fn(async () => ({ content: 'Mock response' })),
        };
        maestro = new core_js_1.Maestro(mockIg, mockCostMeter, mockLlm, { defaultPlannerAgent: 'mock', defaultActionAgent: 'mock' });
    });
    (0, globals_1.it)('should execute standard LLM task', async () => {
        const task = {
            id: 'task-1',
            runId: 'run-1',
            status: 'queued',
            kind: 'action',
            agent: { id: 'agent-1', name: 'gpt', kind: 'llm', modelId: 'gpt-4' },
            description: 'do something',
            input: { requestText: 'hi' },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        const result = await maestro.executeTask(task);
        (0, globals_1.expect)(result.task.status).toBe('succeeded');
        (0, globals_1.expect)(result.artifact).toBeTruthy();
        (0, globals_1.expect)(mockIg.updateTask).toHaveBeenCalledWith(task.id, globals_1.expect.objectContaining({ status: 'running' }));
    });
    (0, globals_1.it)('marks the task failed when the LLM throws', async () => {
        mockLlm.callCompletion.mockImplementation(async () => {
            throw new Error('LLM down');
        });
        const task = {
            id: 'task-2',
            runId: 'run-1',
            status: 'queued',
            kind: 'action',
            agent: { id: 'agent-1', name: 'gpt', kind: 'llm', modelId: 'gpt-4' },
            description: 'do something',
            input: { requestText: 'hi' },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        const result = await maestro.executeTask(task);
        (0, globals_1.expect)(result.task.status).toBe('failed');
        (0, globals_1.expect)(result.task.errorMessage).toContain('LLM down');
    });
    (0, globals_1.it)('executes non-LLM tasks with a placeholder result', async () => {
        const task = {
            id: 'task-3',
            runId: 'run-1',
            status: 'queued',
            kind: 'graph.analysis',
            agent: { id: 'graph-1', name: 'graph', kind: 'graph-engine' },
            description: 'query graph',
            input: { query: 'MATCH (n) RETURN n' },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        const result = await maestro.executeTask(task);
        (0, globals_1.expect)(result.task.status).toBe('succeeded');
        (0, globals_1.expect)(result.artifact?.data).toContain('TODO: implement non-LLM agent');
    });
});
