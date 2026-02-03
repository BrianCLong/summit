import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Pool } from 'pg';
import { PostgresStateStore } from '../postgres-state-store';

jest.mock('pg', () => {
  const mClient = {
    query: jest.fn(),
    release: jest.fn(),
  };
  const mPool = {
    connect: jest.fn(() => Promise.resolve(mClient)),
    query: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

describe('PostgresStateStore', () => {
  let store: PostgresStateStore;
  let mockPool: any;
  let mockClient: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPool = new Pool();
    mockClient = await mockPool.connect();
    store = new PostgresStateStore(mockPool as any);
  });

  it('should create a run with idempotency and initial event', async () => {
    const context: any = {
      run_id: 'test-run-id',
      workflow: { name: 'test-wf', version: '1.0', steps: [] },
      tenant_id: 'tenant-1',
      triggered_by: 'user-1',
      environment: 'prod',
      parameters: {},
      idempotency_key: 'idem-1'
    };

    mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // INSERT workflow_runs
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // INSERT workflow_events
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

    await store.createRun(context);

    expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('BEGIN'));
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO workflow_runs'),
      expect.arrayContaining(['test-run-id', 'test-wf', 'idem-1'])
    );
  });

  it('should update step execution with event and outbox entry', async () => {
    const execution: any = {
      step_id: 'step-1',
      run_id: 'run-1',
      status: 'succeeded',
      attempt: 1,
      metadata: {},
      output: { result: 'ok' }
    };

    mockClient.query.mockResolvedValue({ rows: [] });

    await store.updateStepExecution(execution);

    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE step_executions'),
      expect.anything()
    );
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO workflow_events'),
      expect.arrayContaining(['run-1', 'step-1', 'step_succeeded'])
    );
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO workflow_outbox'),
      expect.arrayContaining(['run-1', 'step.succeeded'])
    );
  });
});
