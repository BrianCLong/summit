"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const engine_1 = require("../engine");
(0, globals_1.describe)('MaestroEngine Recovery', () => {
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
    (0, globals_1.it)('should resume active runs on recover()', async () => {
        const runId = 'recovered-run-1';
        const workflow = {
            name: 'recovery-wf',
            version: '1.0',
            steps: [{ id: 'step-1', name: 'Step 1', plugin: 'test-plugin', config: {} }]
        };
        mockStateStore.getActiveExecutions.mockResolvedValue([
            { run_id: runId, step_id: 'step-1', status: 'running', attempt: 1, metadata: {} }
        ]);
        mockStateStore.getRunDetails.mockResolvedValue({
            run_id: runId,
            workflow_name: workflow.name,
            workflow_version: workflow.version,
            workflow_definition: workflow,
            tenant_id: 't1',
            triggered_by: 'u1',
            environment: 'p',
            parameters: {},
            budget: {}
        });
        mockStateStore.getRunStatus.mockResolvedValue('running');
        await engine.recover();
        (0, globals_1.expect)(mockStateStore.getActiveExecutions).toHaveBeenCalled();
        (0, globals_1.expect)(mockStateStore.getRunDetails).toHaveBeenCalledWith(runId);
    });
    (0, globals_1.it)('should skip already succeeded steps on resume', async () => {
        const context = {
            run_id: 'run-resume',
            workflow: {
                name: 'wf',
                version: '1',
                steps: [
                    { id: 'step-1', name: 'S1', plugin: 'p1', config: {} },
                    { id: 'step-2', name: 'S2', plugin: 'p2', config: {}, depends_on: ['step-1'] }
                ]
            },
            tenant_id: 't', triggered_by: 'u', environment: 'e', parameters: {}
        };
        mockStateStore.getStepExecution.mockImplementation((runId, stepId) => {
            if (stepId === 'step-1')
                return Promise.resolve({ status: 'succeeded' });
            return Promise.resolve(null);
        });
        const plugin = {
            name: 'p1',
            validate: globals_1.jest.fn(),
            execute: globals_1.jest.fn().mockResolvedValue({ output: {} }),
        };
        engine.registerPlugin(plugin);
        // @ts-expect-error - Testing private method
        await engine.executeStepWithRetry(context, context.workflow.steps[0]);
        (0, globals_1.expect)(plugin.execute).not.toHaveBeenCalled();
    });
});
