"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const core_js_1 = require("../src/maestro/core.js");
describe('Maestro Reliability', () => {
    let maestro;
    let mockIg;
    let mockCostMeter;
    let mockLlm;
    beforeEach(() => {
        mockIg = {
            createRun: globals_1.jest.fn(),
            createTask: globals_1.jest.fn(),
            updateTask: globals_1.jest.fn(),
            createArtifact: globals_1.jest.fn(),
        };
        mockCostMeter = {};
        mockLlm = {
            callCompletion: globals_1.jest.fn(),
        };
        maestro = new core_js_1.Maestro(mockIg, mockCostMeter, mockLlm, { defaultPlannerAgent: 'agent-1', defaultActionAgent: 'agent-2' });
    });
    it('should retry LLM call on failure and succeed', async () => {
        const task = {
            id: 'task-1',
            runId: 'run-1',
            kind: 'action',
            status: 'queued',
            agent: { kind: 'llm', modelId: 'gpt-4', id: 'agent-2', name: 'test' },
            description: 'test task',
            input: { requestText: 'test' },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        // Fail twice, then succeed
        mockLlm.callCompletion
            .mockRejectedValueOnce(new Error('Network error'))
            .mockRejectedValueOnce(new Error('Timeout'))
            .mockResolvedValueOnce({ content: 'Success', usage: { totalTokens: 10 } });
        const result = await maestro.executeTask(task);
        expect(result.task.status).toBe('succeeded');
        expect(result.task.output?.result).toBe('Success');
        expect(mockLlm.callCompletion).toHaveBeenCalledTimes(3);
    });
    it('should fail after max retries', async () => {
        const task = {
            id: 'task-1',
            runId: 'run-1',
            kind: 'action',
            status: 'queued',
            agent: { kind: 'llm', modelId: 'gpt-4', id: 'agent-2', name: 'test' },
            description: 'test task',
            input: { requestText: 'test' },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        // Fail 3 times
        mockLlm.callCompletion.mockRejectedValue(new Error('Persistent error'));
        const result = await maestro.executeTask(task);
        expect(result.task.status).toBe('failed');
        expect(result.task.errorMessage).toBe('Persistent error');
        expect(mockLlm.callCompletion).toHaveBeenCalledTimes(3);
    });
});
