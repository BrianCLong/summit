"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const core_1 = require("../../src/maestro/core");
(0, globals_1.describe)('Maestro Core', () => {
    let maestro;
    let mockIgClient;
    let mockCostMeter;
    let mockLlm;
    (0, globals_1.beforeEach)(() => {
        // Re-create mocks for each test to avoid resetMocks: true issue
        mockIgClient = {
            createRun: globals_1.jest.fn(),
            createTask: globals_1.jest.fn(),
            updateTask: globals_1.jest.fn(),
            updateTask: globals_1.jest.fn(),
            createArtifact: globals_1.jest.fn().mockImplementation((a) => Promise.resolve(a)),
        };
        mockCostMeter = {
            summarize: globals_1.jest.fn().mockResolvedValue({ totalTokens: 100, cost: 0.002 }),
        };
        mockLlm = {
            callCompletion: globals_1.jest.fn().mockResolvedValue('Mocked LLM Response'),
        };
        maestro = new core_1.Maestro(mockIgClient, mockCostMeter, mockLlm, {
            defaultPlannerAgent: 'gpt-4',
            defaultActionAgent: 'gpt-3.5',
        });
    });
    (0, globals_1.it)('should create a run', async () => {
        const run = await maestro.createRun('user-1', 'Test Request');
        (0, globals_1.expect)(run).toBeDefined();
        (0, globals_1.expect)(run.id).toBeDefined();
        (0, globals_1.expect)(run.user.id).toBe('user-1');
        (0, globals_1.expect)(mockIgClient.createRun).toHaveBeenCalledWith(run);
    });
    (0, globals_1.it)('should plan a request', async () => {
        const run = { id: 'run-1', user: { id: 'u1' }, createdAt: '', requestText: 'Hello' };
        const tasks = await maestro.planRequest(run);
        (0, globals_1.expect)(tasks).toHaveLength(2); // plan + action
        (0, globals_1.expect)(tasks[0].kind).toBe('plan');
        (0, globals_1.expect)(tasks[1].kind).toBe('action');
        (0, globals_1.expect)(mockIgClient.createTask).toHaveBeenCalledTimes(2);
    });
    (0, globals_1.it)('should execute a task successfully', async () => {
        const task = {
            id: 'task-1',
            runId: 'run-1',
            kind: 'action',
            status: 'queued',
            description: 'Do work',
            input: { requestText: 'Work' },
            agent: { kind: 'llm', modelId: 'gpt-4' },
        };
        const result = await maestro.executeTask(task);
        (0, globals_1.expect)(result.task.status).toBe('succeeded');
        (0, globals_1.expect)(result.artifact).toBeDefined();
        (0, globals_1.expect)(result.artifact?.data).toBe('Mocked LLM Response');
        (0, globals_1.expect)(mockIgClient.updateTask).toHaveBeenCalled();
        (0, globals_1.expect)(mockIgClient.createArtifact).toHaveBeenCalled();
    });
    (0, globals_1.it)('should handle task execution failure', async () => {
        mockLlm.callCompletion.mockRejectedValueOnce(new Error('LLM Error'));
        const task = {
            id: 'task-1',
            runId: 'run-1',
            kind: 'action',
            status: 'queued',
            description: 'Do work',
            input: { requestText: 'Work' },
            agent: { kind: 'llm', modelId: 'gpt-4' },
        };
        const result = await maestro.executeTask(task);
        (0, globals_1.expect)(result.task.status).toBe('failed');
        (0, globals_1.expect)(result.task.errorMessage).toBe('LLM Error');
        (0, globals_1.expect)(result.artifact).toBeNull();
        (0, globals_1.expect)(mockIgClient.updateTask).toHaveBeenCalled();
    });
    (0, globals_1.it)('should run full pipeline', async () => {
        const res = await maestro.runPipeline('user-1', 'Full Run');
        (0, globals_1.expect)(res.run).toBeDefined();
        (0, globals_1.expect)(res.tasks).toHaveLength(2);
        (0, globals_1.expect)(res.results).toHaveLength(1); // Only the action task is 'queued' and executed
        (0, globals_1.expect)(res.costSummary).toBeDefined();
    });
});
