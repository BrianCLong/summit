"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const engine_1 = require("../engine");
(0, globals_1.describe)('MaestroEngine Dependency Optimization', () => {
    let engine;
    let mockStateStore;
    let mockArtifactStore;
    let mockPolicyEngine;
    (0, globals_1.beforeEach)(() => {
        mockStateStore = {
            createRun: globals_1.jest.fn(),
            updateRunStatus: globals_1.jest.fn(),
            getRunStatus: globals_1.jest.fn(),
            getRunDetails: globals_1.jest.fn(),
            createStepExecution: globals_1.jest.fn(),
            updateStepExecution: globals_1.jest.fn(),
            getStepExecution: globals_1.jest.fn(),
            getActiveExecutions: globals_1.jest.fn(),
        };
        mockArtifactStore = {
            store: globals_1.jest.fn(),
            retrieve: globals_1.jest.fn(),
            list: globals_1.jest.fn(),
        };
        mockPolicyEngine = {
            check: globals_1.jest.fn(),
        };
        engine = new engine_1.MaestroEngine(mockStateStore, mockArtifactStore, mockPolicyEngine);
    });
    (0, globals_1.it)('should check all dependencies in parallel', async () => {
        const runId = 'test-run';
        const step = {
            id: 'step-3',
            name: 'Step 3',
            plugin: 'test',
            config: {},
            depends_on: ['step-1', 'step-2']
        };
        // Setup mock to return succeeded steps
        mockStateStore.getStepExecution.mockResolvedValue({
            step_id: 'mock',
            run_id: runId,
            status: 'succeeded',
            attempt: 1,
            metadata: {}
        });
        // @ts-expect-error - Accessing private method (renamed)
        const result = await engine.areDependenciesSatisfied(runId, step);
        (0, globals_1.expect)(result).toBe(true);
        (0, globals_1.expect)(mockStateStore.getStepExecution).toHaveBeenCalledTimes(2);
        (0, globals_1.expect)(mockStateStore.getStepExecution).toHaveBeenCalledWith(runId, 'step-1');
        (0, globals_1.expect)(mockStateStore.getStepExecution).toHaveBeenCalledWith(runId, 'step-2');
    });
    (0, globals_1.it)('should return false if any dependency is not satisfied', async () => {
        const runId = 'test-run-fail';
        const step = {
            id: 'step-3',
            name: 'Step 3',
            plugin: 'test',
            config: {},
            depends_on: ['step-1', 'step-2']
        };
        mockStateStore.getStepExecution.mockImplementation(async (runId, stepId) => {
            if (stepId === 'step-1')
                return { status: 'succeeded' };
            if (stepId === 'step-2')
                return { status: 'failed' };
            return null;
        });
        // @ts-expect-error - Accessing private method (renamed)
        const result = await engine.areDependenciesSatisfied(runId, step);
        (0, globals_1.expect)(result).toBe(false);
    });
});
