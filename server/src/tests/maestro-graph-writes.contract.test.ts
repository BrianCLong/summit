import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { IntelGraphClientImpl } from '../intelgraph/client-impl.js';

const mockRun = jest.fn();
const mockClose = jest.fn().mockResolvedValue(undefined);
const mockSession = { run: mockRun, close: mockClose };
const mockDriver = { session: jest.fn(() => mockSession) };

jest.mock('../config/database.js', () => ({
  getNeo4jDriver: jest.fn(() => mockDriver),
}));

describe('Maestro graph writes contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('emits Run and Step edges for tenant scoping and provenance', async () => {
    const client = new IntelGraphClientImpl();
    await client.createRun({
      id: 'run-1',
      user: { id: 'user-1' },
      createdAt: '2026-01-02T09:00:00Z',
      updatedAt: '2026-01-02T09:00:00Z',
      status: 'queued',
      tenantId: 'tenant-abc',
      requestText: 'run request',
    });

    const runQuery = mockRun.mock.calls[0][0] as string;
    expect(runQuery).toContain('TRIGGERED_BY');
    expect(runQuery).toContain('IN_TENANT');
    expect(runQuery).toContain('CONSUMED');

    await client.createTask({
      id: 'step-1',
      runId: 'run-1',
      tenantId: 'tenant-abc',
      status: 'queued',
      agent: { id: 'agent-1', name: 'planner', kind: 'llm' },
      kind: 'plan',
      description: 'Plan',
      input: { requestText: 'run request', tenantId: 'tenant-abc' },
      createdAt: '2026-01-02T09:01:00Z',
      updatedAt: '2026-01-02T09:01:00Z',
    });

    const taskQuery = mockRun.mock.calls[1][0] as string;
    expect(taskQuery).toContain('PRODUCED');
    expect(taskQuery).toContain('CONSUMED');
    expect(taskQuery).toContain('IN_TENANT');

    await client.createArtifact({
      id: 'receipt-1',
      runId: 'run-1',
      taskId: 'step-1',
      kind: 'text',
      label: 'task-output',
      data: 'ok',
      createdAt: '2026-01-02T09:02:00Z',
    });

    const artifactQuery = mockRun.mock.calls[2][0] as string;
    expect(artifactQuery).toContain('PRODUCED');
    expect(artifactQuery).toContain('IN_TENANT');
  });
});
