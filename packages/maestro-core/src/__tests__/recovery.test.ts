import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { MaestroEngine, StateStore, ArtifactStore, PolicyEngine, RunContext } from '../engine';

describe('MaestroEngine Recovery', () => {
  let engine: MaestroEngine;
  let mockStateStore: jest.Mocked<StateStore>;
  let mockArtifactStore: jest.Mocked<ArtifactStore>;
  let mockPolicyEngine: jest.Mocked<PolicyEngine>;

  beforeEach(() => {
    mockStateStore = {
      createRun: jest.fn(),
      updateRunStatus: jest.fn(),
      getRunStatus: jest.fn(),
      getRunDetails: jest.fn(),
      createStepExecution: jest.fn(),
      updateStepExecution: jest.fn(),
      getStepExecution: jest.fn(),
      getActiveExecutions: jest.fn(),
    } as any;

    mockArtifactStore = {
      store: jest.fn(),
      retrieve: jest.fn(),
      list: jest.fn(),
    } as any;

    mockPolicyEngine = {
      check: jest.fn(),
    } as any;

    engine = new MaestroEngine(mockStateStore, mockArtifactStore, mockPolicyEngine);
  });

  it('should resume active runs on recover()', async () => {
    const runId = 'recovered-run-1';
    const workflow = {
      name: 'recovery-wf',
      version: '1.0',
      steps: [{ id: 'step-1', name: 'Step 1', plugin: 'test-plugin', config: {} }]
    };

    mockStateStore.getActiveExecutions.mockResolvedValue([
      { run_id: runId, step_id: 'step-1', status: 'running', attempt: 1, metadata: {} } as any
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

    expect(mockStateStore.getActiveExecutions).toHaveBeenCalled();
    expect(mockStateStore.getRunDetails).toHaveBeenCalledWith(runId);
  });

  it('should skip already succeeded steps on resume', async () => {
    const context: RunContext = {
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
      if (stepId === 'step-1') return Promise.resolve({ status: 'succeeded' } as any);
      return Promise.resolve(null);
    });

    const plugin = {
      name: 'p1',
      validate: jest.fn(),
      execute: jest.fn<any>().mockResolvedValue({ output: {} }),
    } as any;
    engine.registerPlugin(plugin);

    // @ts-expect-error - Testing private method
    await engine.executeStepWithRetry(context, context.workflow.steps[0]);

    expect(plugin.execute).not.toHaveBeenCalled();
  });
});
