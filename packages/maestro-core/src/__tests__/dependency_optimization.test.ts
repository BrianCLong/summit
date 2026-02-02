import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { MaestroEngine, StateStore, ArtifactStore, PolicyEngine } from '../engine';

describe('MaestroEngine Dependency Optimization', () => {
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

  it('should check all dependencies in parallel', async () => {
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
    } as any);

    // @ts-expect-error - Accessing private method (renamed)
    const result = await engine.areDependenciesSatisfied(runId, step);

    expect(result).toBe(true);
    expect(mockStateStore.getStepExecution).toHaveBeenCalledTimes(2);
    expect(mockStateStore.getStepExecution).toHaveBeenCalledWith(runId, 'step-1');
    expect(mockStateStore.getStepExecution).toHaveBeenCalledWith(runId, 'step-2');
  });

  it('should return false if any dependency is not satisfied', async () => {
    const runId = 'test-run-fail';
    const step = {
      id: 'step-3',
      name: 'Step 3',
      plugin: 'test',
      config: {},
      depends_on: ['step-1', 'step-2']
    };

    mockStateStore.getStepExecution.mockImplementation(async (runId, stepId) => {
      if (stepId === 'step-1') return { status: 'succeeded' } as any;
      if (stepId === 'step-2') return { status: 'failed' } as any;
      return null;
    });

    // @ts-expect-error - Accessing private method (renamed)
    const result = await engine.areDependenciesSatisfied(runId, step);
    expect(result).toBe(false);
  });
});
