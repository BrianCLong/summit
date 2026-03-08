"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const OrchestratorPostgresStore_1 = require("./OrchestratorPostgresStore");
// Mock the logger
vitest_1.vi.mock('../../src/config/logger', () => ({
    logger: {
        info: vitest_1.vi.fn(),
        error: vitest_1.vi.fn(),
        debug: vitest_1.vi.fn(),
        warn: vitest_1.vi.fn(),
    }
}));
(0, vitest_1.describe)('OrchestratorPostgresStore', () => {
    let mockPool;
    let store;
    let mockClient;
    (0, vitest_1.beforeEach)(() => {
        mockClient = {
            query: vitest_1.vi.fn(),
            connect: vitest_1.vi.fn(),
            release: vitest_1.vi.fn(),
        };
        mockPool = {
            query: vitest_1.vi.fn(),
            connect: vitest_1.vi.fn().mockResolvedValue(mockClient),
        };
        store = new OrchestratorPostgresStore_1.OrchestratorPostgresStore({ pool: mockPool });
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('updateAgent', () => {
        (0, vitest_1.it)('should update agent properties correctly', async () => {
            const agentId = 'test-agent-id';
            const updates = {
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
            mockClient.query.mockResolvedValueOnce({ rowCount: 1 }); // UPDATE query
            mockClient.query.mockResolvedValueOnce({ rows: [mockAgentRow] }); // Return agent data
            mockPool.query.mockResolvedValue({ rows: [] }); // Audit log insertion
            const result = await store.updateAgent(agentId, updates, actor);
            (0, vitest_1.expect)(result).toEqual({
                id: agentId,
                name: 'Updated Name',
                role: 'Test Role',
                model: 'Test Model',
                status: 'inactive',
                routingWeight: 50,
                metrics: {},
            });
            (0, vitest_1.expect)(mockClient.query).toHaveBeenCalledTimes(2); // UPDATE and RETURNING
            (0, vitest_1.expect)(mockPool.query).toHaveBeenCalledWith(vitest_1.expect.any(String), // SQL string for audit log
            vitest_1.expect.arrayContaining(['test-user', 'update_agent', `agent:${agentId}`, vitest_1.expect.any(String)]));
        });
        (0, vitest_1.it)('should return null if agent does not exist', async () => {
            const agentId = 'non-existent-agent';
            const updates = { status: 'inactive' };
            const actor = 'test-user';
            // Mock UPDATE returning 0 rows affected
            mockClient.query.mockResolvedValueOnce({ rowCount: 0 });
            const result = await store.updateAgent(agentId, updates, actor);
            (0, vitest_1.expect)(result).toBeNull();
        });
    });
    (0, vitest_1.describe)('getCoordinationTaskById', () => {
        (0, vitest_1.it)('should return coordination task when exists', async () => {
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
            mockPool.query.mockResolvedValue({ rows: [mockTaskRow] });
            const result = await store.getCoordinationTaskById(taskId);
            (0, vitest_1.expect)(result).toEqual({
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
        (0, vitest_1.it)('should return null when task does not exist', async () => {
            mockPool.query.mockResolvedValue({ rows: [] });
            const result = await store.getCoordinationTaskById('non-existent');
            (0, vitest_1.expect)(result).toBeNull();
        });
    });
    (0, vitest_1.describe)('createCoordinationChannel', () => {
        (0, vitest_1.it)('should create coordination channel successfully', async () => {
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
            mockPool.query
                .mockResolvedValueOnce({ rows: [mockChannelRow] }) // Insert query result
                .mockResolvedValueOnce({ rows: [] }); // Audit log insert
            const result = await store.createCoordinationChannel(topic, participantIds, actor);
            (0, vitest_1.expect)(result.id).toBeDefined();
            (0, vitest_1.expect)(result.topic).toBe(topic);
            (0, vitest_1.expect)(result.participants).toEqual(participantIds);
            (0, vitest_1.expect)(result.status).toBe('active');
        });
    });
    (0, vitest_1.describe)('initiateConsensus', () => {
        (0, vitest_1.it)('should initiate consensus proposal', async () => {
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
            mockPool.query
                .mockResolvedValueOnce({ rows: [mockProposalRow] }) // Insert query result
                .mockResolvedValueOnce({ rows: [] }); // Audit log insert
            const result = await store.initiateConsensus(coordinatorId, topic, proposal, voterIds, deadlineHours, actor);
            (0, vitest_1.expect)(result.id).toBeDefined();
            (0, vitest_1.expect)(result.topic).toBe(topic);
            (0, vitest_1.expect)(result.proposal).toEqual(proposal);
            (0, vitest_1.expect)(result.coordinatorId).toBe(coordinatorId);
            (0, vitest_1.expect)(result.voters).toEqual(voterIds);
            (0, vitest_1.expect)(result.status).toBe('voting');
        });
    });
});
