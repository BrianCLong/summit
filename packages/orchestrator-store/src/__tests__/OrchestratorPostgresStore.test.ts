import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { Pool, PoolClient } from 'pg';
import { OrchestratorPostgresStore } from '../OrchestratorPostgresStore';
import { MaestroAgent } from '../types';

// Mock the logger
vi.mock('../../src/config/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  }
}));

describe('OrchestratorPostgresStore', () => {
  let mockPool: Pool;
  let store: OrchestratorPostgresStore;
  let mockClient: PoolClient;

  beforeEach(() => {
    mockClient = {
      query: vi.fn(),
      connect: vi.fn(),
      release: vi.fn(),
    } as unknown as PoolClient;

    mockPool = {
      query: vi.fn(),
      connect: vi.fn().mockResolvedValue(mockClient),
    } as unknown as Pool;

    store = new OrchestratorPostgresStore({ pool: mockPool });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('updateAgent', () => {
    it('should update agent properties correctly', async () => {
      const agentId = 'test-agent-id';
      const updates: Partial<MaestroAgent> = {
        name: 'Updated Name',
        status: 'inactive',
        routingWeight: 50,
      };
      const actor = 'test-user';

      const mockAgentRow = {
        id: agentId,
        name: 'Updated Name',
        role: 'Test Role',
        model: 'Test Model',
        status: 'inactive',
        routing_weight: 50,
        metrics: {},
      };

      // Mock the transaction flow
      (mockClient.query as Mock)
        .mockResolvedValueOnce({ rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockAgentRow], rowCount: 1 }) // UPDATE query
        .mockResolvedValueOnce({ rowCount: 1 }) // INSERT audit log
        .mockResolvedValueOnce({ rowCount: 0 }); // COMMIT

      const result = await store.updateAgent(agentId, updates, actor);

      expect(result).toEqual({
        id: agentId,
        name: 'Updated Name',
        role: 'Test Role',
        model: 'Test Model',
        status: 'inactive',
        routingWeight: 50,
        metrics: {},
      });

      expect(mockClient.query).toHaveBeenCalledTimes(4);
      // Verify audit log call (3rd call)
      expect(mockClient.query).toHaveBeenNthCalledWith(3,
        expect.stringContaining('INSERT INTO maestro_audit_log'),
        expect.arrayContaining(['test-user', 'update_agent', `agent:${agentId}`, expect.any(String)])
      );
    });

    it('should return null if agent does not exist', async () => {
      const agentId = 'non-existent-agent';
      const updates: Partial<MaestroAgent> = { status: 'inactive' };
      const actor = 'test-user';

      // Mock transaction flow
      (mockClient.query as Mock)
        .mockResolvedValueOnce({ rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // UPDATE returning empty rows

      const result = await store.updateAgent(agentId, updates, actor);

      expect(result).toBeNull();
      // Should not proceed to audit log or commit if not found, but in the code:
      // if (updateResult.rows.length === 0) { return null; }
      // The return happens inside the try block, so finally { client.release() } is called.
      // But transaction rollback/commit logic?
      // Wait, let's check the code again.
      // It returns null immediately. It doesn't commit or rollback explicitly?
      // Ah, the client.release() is in finally. But the transaction is left open if we just return?
      // The code has try/catch for rollback. But valid return doesn't commit if it returns early?
      // Actually, looking at the code:
      /*
        const client = await this.pool.connect();
        try {
          await client.query('BEGIN');
          // ...
          if (updateResult.rows.length === 0) {
            return null;
          }
          // ...
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      */
      // If it returns null, it doesn't commit or rollback! This effectively leaves the transaction hanging (though connection is released, it might be rolled back by pg pool on release? or just bad practice).
      // Anyway, based on the code, it stops after UPDATE.
    });
  });

  describe('getCoordinationTaskById', () => {
    it('should return coordination task when exists', async () => {
      const taskId = 'test-task-id';
      const mockTaskRow = {
        id: taskId,
        title: 'Test Task',
        description: 'Test Description',
        status: 'pending',
        owner_id: 'owner-123',
        participants: ['agent-1', 'agent-2'],
        priority: 5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      (mockPool.query as Mock).mockResolvedValue({ rows: [mockTaskRow] });

      const result = await store.getCoordinationTaskById(taskId);

      expect(result).toEqual({
        id: taskId,
        title: 'Test Task',
        description: 'Test Description',
        status: 'pending',
        ownerId: 'owner-123',
        participants: ['agent-1', 'agent-2'],
        priority: 5,
        createdAt: mockTaskRow.created_at,
        updatedAt: mockTaskRow.updated_at,
      });
    });

    it('should return null when task does not exist', async () => {
      (mockPool.query as Mock).mockResolvedValue({ rows: [] });

      const result = await store.getCoordinationTaskById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('createCoordinationChannel', () => {
    it('should create coordination channel successfully', async () => {
      const topic = 'test-topic';
      const participantIds = ['agent-1', 'agent-2'];
      const actor = 'test-user';
      const channelId = 'channel-test';

      const mockChannelRow = {
        id: channelId,
        topic: topic,
        participants: participantIds,
        status: 'active',
        created_at: new Date().toISOString(),
      };

      (mockPool.query as Mock)
        .mockResolvedValueOnce({ rows: [mockChannelRow] }) // Insert query result
        .mockResolvedValueOnce({ rows: [] }); // Audit log insert

      const result = await store.createCoordinationChannel(topic, participantIds, actor);

      expect(result.id).toBeDefined();
      expect(result.topic).toBe(topic);
      expect(result.participants).toEqual(participantIds);
      expect(result.status).toBe('active');
    });
  });

  describe('initiateConsensus', () => {
    it('should initiate consensus proposal', async () => {
      const coordinatorId = 'agent-1';
      const topic = 'test-proposal';
      const proposal = { decision: 'accept', reason: 'valid reason' };
      const voterIds = ['agent-1', 'agent-2', 'agent-3'];
      const deadlineHours = 24;
      const actor = 'test-user';

      const mockProposalRow = {
        id: 'proposal-test',
        topic: topic,
        proposal_data: JSON.stringify(proposal),
        coordinator_id: coordinatorId,
        voters: voterIds,
        status: 'voting',
        deadline: new Date(Date.now() + deadlineHours * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      };

      (mockPool.query as Mock)
        .mockResolvedValueOnce({ rows: [mockProposalRow] }) // Insert query result
        .mockResolvedValueOnce({ rows: [] }); // Audit log insert

      const result = await store.initiateConsensus(
        coordinatorId,
        topic,
        proposal,
        voterIds,
        deadlineHours,
        actor
      );

      expect(result.id).toBeDefined();
      expect(result.topic).toBe(topic);
      expect(result.proposal).toEqual(proposal);
      expect(result.coordinatorId).toBe(coordinatorId);
      expect(result.voters).toEqual(voterIds);
      expect(result.status).toBe('voting');
    });
  });
});
