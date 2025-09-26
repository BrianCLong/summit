import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import { app, setWorkflowServiceInstance } from '../server';
import type { WorkflowService, WorkflowExecution } from '../services/WorkflowService';
import type { MaestroPersonaProfile } from '../services/maestroPersona';

jest.mock('../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { id: 'test-user', email: 'test@example.com', role: 'admin' };
    next();
  },
  authorize: () => (req: any, _res: any, next: any) => {
    req.user = req.user || { id: 'test-user', email: 'test@example.com', role: 'admin' };
    next();
  },
}));

jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('workflow-engine server', () => {
  const executeWorkflowMock = jest.fn() as jest.MockedFunction<
    WorkflowService['executeWorkflow']
  >;
  const retryExecutionMock = jest.fn() as jest.MockedFunction<WorkflowService['retryExecution']>;

  const baseExecution: WorkflowExecution = {
    id: 'exec-1',
    workflowId: 'wf-123',
    workflowVersion: '1.0.0',
    status: 'running',
    startedAt: new Date(),
    triggerType: 'manual',
    triggerData: {},
    context: {},
    steps: [],
  };

  beforeEach(() => {
    executeWorkflowMock.mockReset();
    retryExecutionMock.mockReset();

    executeWorkflowMock.mockResolvedValue({
      ...baseExecution,
      context: { foo: 'bar' },
    });

    retryExecutionMock.mockResolvedValue({
      ...baseExecution,
      status: 'running',
    });

    const mockService: Partial<WorkflowService> = {
      executeWorkflow: executeWorkflowMock,
      retryExecution: retryExecutionMock,
    };

    setWorkflowServiceInstance(mockService as WorkflowService);
  });

  it('executes a workflow with persona context', async () => {
    const response = await request(app)
      .post('/api/workflows/wf-123/execute')
      .send({
        triggerData: { foo: 'bar' },
        persona: { mode: 'expedited', version: 'v2.0' },
      })
      .expect(201);

    expect(executeWorkflowMock).toHaveBeenCalledTimes(1);
    expect(executeWorkflowMock).toHaveBeenCalledWith(
      'wf-123',
      'manual',
      { foo: 'bar' },
      'test-user',
      { mode: 'expedited', version: 'v2.0' },
    );

    expect(response.body.id).toBe('exec-1');
    expect(response.body.workflowId).toBe('wf-123');
  });

  it('retries a workflow execution with argo metadata', async () => {
    await request(app)
      .post('/api/executions/exec-1/retry')
      .send({ nodeId: 'node-1', restartSuccessful: true, persona: { mode: 'standard' } })
      .expect(200);

    expect(retryExecutionMock).toHaveBeenCalledTimes(1);
    expect(retryExecutionMock).toHaveBeenCalledWith('exec-1', {
      nodeId: 'node-1',
      restartSuccessful: true,
      personaOverrides: { mode: 'standard' },
      requestedBy: 'test-user',
    });
  });
});
