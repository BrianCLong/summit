import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { Pool, PoolClient } from 'pg';
import { OrchestratorPostgresStore } from './OrchestratorPostgresStore';
import { MaestroAgent } from './types';

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
      (mockClient.query as Mock).mockResolvedValueOnce({ rowCount: 1 }); // UPDATE query
      (mockClient.query as Mock).mockResolvedValueOnce({ rows: [mockAgentRow] }); // Return agent data
      (mockPool.query as Mock).mockResolvedValue({ rows: [] }); // Audit log insertion

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

      expect(mockClient.query).toHaveBeenCalledTimes(2); // UPDATE and RETURNING
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String), // SQL string for audit log
        expect.arrayContaining(['test-user', 'update_agent', `agent:${agentId}`, expect.any(String)])
      );
    });

    it('should return null if agent does not exist', async () => {
      const agentId = 'non-existent-agent';
      const updates: Partial<MaestroAgent> = { status: 'inactive' };
      const actor = 'test-user';

      // Mock UPDATE returning 0 rows affected
      (mockClient.query as Mock).mockResolvedValueOnce({ rowCount: 0 });

      const result = await store.updateAgent(agentId, updates, actor);

      expect(result).toBeNull();
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