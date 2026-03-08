"use strict";
/**
 * Product Increment Repository Tests
 *
 * Comprehensive test suite for ProductIncrementRepo including:
 * - CRUD operations for increments, goals, deliverables
 * - Team assignments
 * - Metrics snapshots
 * - Edge cases and error handling
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Mock the pg module
const mockQuery = globals_1.jest.fn();
const mockConnect = globals_1.jest.fn();
const mockRelease = globals_1.jest.fn();
await globals_1.jest.unstable_mockModule('../../provenance/ledger.js', () => ({
    provenanceLedger: {
        appendEntry: globals_1.jest.fn().mockResolvedValue(undefined),
    },
}));
await globals_1.jest.unstable_mockModule('../../config/logger', () => ({
    __esModule: true,
    default: {
        child: globals_1.jest.fn().mockReturnValue({
            info: globals_1.jest.fn(),
            warn: globals_1.jest.fn(),
            error: globals_1.jest.fn(),
            debug: globals_1.jest.fn(),
        }),
        info: globals_1.jest.fn(),
        warn: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
        debug: globals_1.jest.fn(),
    },
}));
const { ProductIncrementRepo } = await Promise.resolve().then(() => __importStar(require('../ProductIncrementRepo.js')));
const { provenanceLedger } = await Promise.resolve().then(() => __importStar(require('../../provenance/ledger.js')));
(0, globals_1.describe)('ProductIncrementRepo', () => {
    let repo;
    let mockPool;
    let mockClient;
    (0, globals_1.beforeEach)(() => {
        mockClient = {
            query: globals_1.jest.fn(),
            release: mockRelease,
        };
        mockConnect.mockResolvedValue(mockClient);
        mockPool = { query: mockQuery, connect: mockConnect };
        repo = new ProductIncrementRepo(mockPool);
        globals_1.jest.clearAllMocks();
        const appendEntryMock = provenanceLedger.appendEntry;
        appendEntryMock.mockImplementation(async () => undefined);
    });
    (0, globals_1.afterEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    // ===========================================================================
    // INCREMENT CRUD TESTS
    // ===========================================================================
    (0, globals_1.describe)('createIncrement', () => {
        (0, globals_1.it)('should create a new increment with required fields', async () => {
            const mockRow = {
                id: 'test-id',
                tenant_id: 'tenant-1',
                name: 'Sprint 1',
                description: null,
                version: '1.0.0',
                status: 'planning',
                planned_start_date: null,
                planned_end_date: null,
                actual_start_date: null,
                actual_end_date: null,
                planned_capacity_points: 40,
                committed_points: 0,
                completed_points: 0,
                velocity: null,
                release_notes: null,
                release_tag: null,
                release_url: null,
                props: {},
                created_at: new Date(),
                updated_at: new Date(),
                created_by: 'user-1',
                updated_by: null,
            };
            mockQuery.mockResolvedValueOnce({ rows: [mockRow] });
            const result = await repo.createIncrement({
                tenantId: 'tenant-1',
                name: 'Sprint 1',
                version: '1.0.0',
                plannedCapacityPoints: 40,
            }, 'user-1');
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.id).toBe('test-id');
            (0, globals_1.expect)(result.name).toBe('Sprint 1');
            (0, globals_1.expect)(result.version).toBe('1.0.0');
            (0, globals_1.expect)(result.status).toBe('planning');
            (0, globals_1.expect)(mockQuery).toHaveBeenCalledTimes(1);
        });
        (0, globals_1.it)('should create an increment with all optional fields', async () => {
            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-01-15');
            const mockRow = {
                id: 'test-id',
                tenant_id: 'tenant-1',
                name: 'Sprint 1',
                description: 'First sprint',
                version: '1.0.0',
                status: 'planning',
                planned_start_date: startDate,
                planned_end_date: endDate,
                actual_start_date: null,
                actual_end_date: null,
                planned_capacity_points: 40,
                committed_points: 0,
                completed_points: 0,
                velocity: null,
                release_notes: 'Initial release',
                release_tag: 'v1.0.0',
                release_url: 'https://example.com/release/1.0.0',
                props: { custom: 'data' },
                created_at: new Date(),
                updated_at: new Date(),
                created_by: 'user-1',
                updated_by: null,
            };
            mockQuery.mockResolvedValueOnce({ rows: [mockRow] });
            const result = await repo.createIncrement({
                tenantId: 'tenant-1',
                name: 'Sprint 1',
                description: 'First sprint',
                version: '1.0.0',
                plannedStartDate: startDate,
                plannedEndDate: endDate,
                plannedCapacityPoints: 40,
                releaseNotes: 'Initial release',
                releaseTag: 'v1.0.0',
                releaseUrl: 'https://example.com/release/1.0.0',
                props: { custom: 'data' },
            }, 'user-1');
            (0, globals_1.expect)(result.description).toBe('First sprint');
            (0, globals_1.expect)(result.plannedStartDate).toEqual(startDate);
            (0, globals_1.expect)(result.plannedEndDate).toEqual(endDate);
            (0, globals_1.expect)(result.releaseTag).toBe('v1.0.0');
        });
    });
    (0, globals_1.describe)('updateIncrement', () => {
        (0, globals_1.it)('should update increment fields', async () => {
            const mockRow = {
                id: 'test-id',
                tenant_id: 'tenant-1',
                name: 'Updated Sprint',
                description: 'Updated description',
                version: '1.0.0',
                status: 'active',
                planned_start_date: null,
                planned_end_date: null,
                actual_start_date: new Date(),
                actual_end_date: null,
                planned_capacity_points: 50,
                committed_points: 30,
                completed_points: 10,
                velocity: null,
                release_notes: null,
                release_tag: null,
                release_url: null,
                props: {},
                created_at: new Date(),
                updated_at: new Date(),
                created_by: 'user-1',
                updated_by: 'user-2',
            };
            mockQuery.mockResolvedValueOnce({ rows: [mockRow] });
            const result = await repo.updateIncrement('test-id', {
                name: 'Updated Sprint',
                description: 'Updated description',
                status: 'active',
            }, 'user-2');
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.name).toBe('Updated Sprint');
            (0, globals_1.expect)(result.status).toBe('active');
            (0, globals_1.expect)(result.updatedBy).toBe('user-2');
        });
        (0, globals_1.it)('should return existing increment when no fields to update', async () => {
            const mockRow = {
                id: 'test-id',
                tenant_id: 'tenant-1',
                name: 'Sprint 1',
                description: null,
                version: '1.0.0',
                status: 'planning',
                planned_start_date: null,
                planned_end_date: null,
                actual_start_date: null,
                actual_end_date: null,
                planned_capacity_points: 40,
                committed_points: 0,
                completed_points: 0,
                velocity: null,
                release_notes: null,
                release_tag: null,
                release_url: null,
                props: {},
                created_at: new Date(),
                updated_at: new Date(),
                created_by: 'user-1',
                updated_by: null,
            };
            mockQuery.mockResolvedValueOnce({ rows: [mockRow] });
            const result = await repo.updateIncrement('test-id', {}, 'user-2');
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.name).toBe('Sprint 1');
        });
        (0, globals_1.it)('should return null when increment not found', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });
            const result = await repo.updateIncrement('non-existent', { name: 'New Name' }, 'user-1');
            (0, globals_1.expect)(result).toBeNull();
        });
    });
    (0, globals_1.describe)('deleteIncrement', () => {
        (0, globals_1.it)('should delete an increment successfully', async () => {
            mockClient.query
                .mockResolvedValueOnce({}) // BEGIN
                .mockResolvedValueOnce({ rows: [{ tenant_id: 'tenant-1' }] }) // DELETE
                .mockResolvedValueOnce({}); // COMMIT
            const result = await repo.deleteIncrement('test-id', 'user-1');
            (0, globals_1.expect)(result).toBe(true);
            (0, globals_1.expect)(mockClient.query).toHaveBeenCalledTimes(3);
        });
        (0, globals_1.it)('should return false when increment not found', async () => {
            mockClient.query
                .mockResolvedValueOnce({}) // BEGIN
                .mockResolvedValueOnce({ rows: [] }) // DELETE
                .mockResolvedValueOnce({}); // COMMIT
            const result = await repo.deleteIncrement('non-existent', 'user-1');
            (0, globals_1.expect)(result).toBe(false);
        });
        (0, globals_1.it)('should rollback on error', async () => {
            mockClient.query
                .mockResolvedValueOnce({}) // BEGIN
                .mockRejectedValueOnce(new Error('Delete failed')); // DELETE
            await (0, globals_1.expect)(repo.deleteIncrement('test-id', 'user-1')).rejects.toThrow('Delete failed');
            (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        });
    });
    (0, globals_1.describe)('findIncrementById', () => {
        (0, globals_1.it)('should find increment by ID', async () => {
            const mockRow = {
                id: 'test-id',
                tenant_id: 'tenant-1',
                name: 'Sprint 1',
                description: null,
                version: '1.0.0',
                status: 'planning',
                planned_start_date: null,
                planned_end_date: null,
                actual_start_date: null,
                actual_end_date: null,
                planned_capacity_points: 40,
                committed_points: 0,
                completed_points: 0,
                velocity: null,
                release_notes: null,
                release_tag: null,
                release_url: null,
                props: {},
                created_at: new Date(),
                updated_at: new Date(),
                created_by: 'user-1',
                updated_by: null,
            };
            mockQuery.mockResolvedValueOnce({ rows: [mockRow] });
            const result = await repo.findIncrementById('test-id');
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.id).toBe('test-id');
        });
        (0, globals_1.it)('should filter by tenant when provided', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });
            await repo.findIncrementById('test-id', 'tenant-1');
            (0, globals_1.expect)(mockQuery).toHaveBeenCalledWith(globals_1.expect.stringContaining('AND tenant_id = $2'), ['test-id', 'tenant-1']);
        });
        (0, globals_1.it)('should return null when not found', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });
            const result = await repo.findIncrementById('non-existent');
            (0, globals_1.expect)(result).toBeNull();
        });
    });
    (0, globals_1.describe)('listIncrements', () => {
        (0, globals_1.it)('should list increments with default pagination', async () => {
            const mockRows = [
                {
                    id: 'inc-1',
                    tenant_id: 'tenant-1',
                    name: 'Sprint 1',
                    description: null,
                    version: '1.0.0',
                    status: 'planning',
                    planned_start_date: null,
                    planned_end_date: null,
                    actual_start_date: null,
                    actual_end_date: null,
                    planned_capacity_points: 40,
                    committed_points: 0,
                    completed_points: 0,
                    velocity: null,
                    release_notes: null,
                    release_tag: null,
                    release_url: null,
                    props: {},
                    created_at: new Date(),
                    updated_at: new Date(),
                    created_by: 'user-1',
                    updated_by: null,
                },
                {
                    id: 'inc-2',
                    tenant_id: 'tenant-1',
                    name: 'Sprint 2',
                    description: null,
                    version: '1.1.0',
                    status: 'active',
                    planned_start_date: null,
                    planned_end_date: null,
                    actual_start_date: null,
                    actual_end_date: null,
                    planned_capacity_points: 40,
                    committed_points: 20,
                    completed_points: 5,
                    velocity: null,
                    release_notes: null,
                    release_tag: null,
                    release_url: null,
                    props: {},
                    created_at: new Date(),
                    updated_at: new Date(),
                    created_by: 'user-1',
                    updated_by: null,
                },
            ];
            mockQuery.mockResolvedValueOnce({ rows: mockRows });
            const result = await repo.listIncrements({ tenantId: 'tenant-1' });
            (0, globals_1.expect)(result).toHaveLength(2);
            (0, globals_1.expect)(result[0].id).toBe('inc-1');
            (0, globals_1.expect)(result[1].id).toBe('inc-2');
        });
        (0, globals_1.it)('should filter by status', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });
            await repo.listIncrements({
                tenantId: 'tenant-1',
                filter: { status: 'active' },
            });
            (0, globals_1.expect)(mockQuery).toHaveBeenCalledWith(globals_1.expect.stringContaining('status = $2'), globals_1.expect.arrayContaining(['tenant-1', 'active']));
        });
        (0, globals_1.it)('should filter by multiple statuses', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });
            await repo.listIncrements({
                tenantId: 'tenant-1',
                filter: { status: ['active', 'completed'] },
            });
            (0, globals_1.expect)(mockQuery).toHaveBeenCalledWith(globals_1.expect.stringContaining('status = ANY($2)'), globals_1.expect.arrayContaining(['tenant-1', ['active', 'completed']]));
        });
        (0, globals_1.it)('should apply search filter', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });
            await repo.listIncrements({
                tenantId: 'tenant-1',
                filter: { search: 'Sprint' },
            });
            (0, globals_1.expect)(mockQuery).toHaveBeenCalledWith(globals_1.expect.stringContaining('name ILIKE'), globals_1.expect.arrayContaining(['tenant-1', '%Sprint%']));
        });
    });
    // ===========================================================================
    // GOAL TESTS
    // ===========================================================================
    (0, globals_1.describe)('createGoal', () => {
        (0, globals_1.it)('should create a goal with required fields', async () => {
            const mockRow = {
                id: 'goal-1',
                increment_id: 'inc-1',
                tenant_id: 'tenant-1',
                title: 'Implement login',
                description: null,
                category: 'feature',
                priority: 'high',
                story_points: null,
                status: 'pending',
                acceptance_criteria: [],
                success_metrics: {},
                completed_at: null,
                completion_notes: null,
                props: {},
                created_at: new Date(),
                updated_at: new Date(),
                created_by: 'user-1',
            };
            mockQuery.mockResolvedValueOnce({ rows: [mockRow] });
            const result = await repo.createGoal({
                incrementId: 'inc-1',
                tenantId: 'tenant-1',
                title: 'Implement login',
            }, 'user-1');
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.id).toBe('goal-1');
            (0, globals_1.expect)(result.title).toBe('Implement login');
            (0, globals_1.expect)(result.status).toBe('pending');
        });
    });
    (0, globals_1.describe)('updateGoal', () => {
        (0, globals_1.it)('should update goal status to completed', async () => {
            const mockRow = {
                id: 'goal-1',
                increment_id: 'inc-1',
                tenant_id: 'tenant-1',
                title: 'Implement login',
                description: null,
                category: 'feature',
                priority: 'high',
                story_points: 8,
                status: 'completed',
                acceptance_criteria: [],
                success_metrics: {},
                completed_at: new Date(),
                completion_notes: 'Done!',
                props: {},
                created_at: new Date(),
                updated_at: new Date(),
                created_by: 'user-1',
            };
            mockQuery.mockResolvedValueOnce({ rows: [mockRow] });
            const result = await repo.updateGoal('goal-1', {
                status: 'completed',
                completedAt: new Date(),
                completionNotes: 'Done!',
            });
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.status).toBe('completed');
            (0, globals_1.expect)(result.completionNotes).toBe('Done!');
        });
    });
    // ===========================================================================
    // DELIVERABLE TESTS
    // ===========================================================================
    (0, globals_1.describe)('createDeliverable', () => {
        (0, globals_1.it)('should create a deliverable with required fields', async () => {
            const mockRow = {
                id: 'del-1',
                increment_id: 'inc-1',
                goal_id: null,
                tenant_id: 'tenant-1',
                title: 'Add login form',
                description: null,
                deliverable_type: 'task',
                parent_id: null,
                priority: 'medium',
                story_points: null,
                status: 'backlog',
                assignee_id: null,
                assignee_name: null,
                external_id: null,
                external_url: null,
                progress_percent: 0,
                started_at: null,
                completed_at: null,
                investigation_id: null,
                props: {},
                created_at: new Date(),
                updated_at: new Date(),
                created_by: 'user-1',
            };
            mockQuery.mockResolvedValueOnce({ rows: [mockRow] });
            const result = await repo.createDeliverable({
                incrementId: 'inc-1',
                tenantId: 'tenant-1',
                title: 'Add login form',
            }, 'user-1');
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.id).toBe('del-1');
            (0, globals_1.expect)(result.title).toBe('Add login form');
            (0, globals_1.expect)(result.status).toBe('backlog');
            (0, globals_1.expect)(result.progressPercent).toBe(0);
        });
        (0, globals_1.it)('should create a deliverable linked to investigation', async () => {
            const mockRow = {
                id: 'del-1',
                increment_id: 'inc-1',
                goal_id: 'goal-1',
                tenant_id: 'tenant-1',
                title: 'Investigate security issue',
                description: 'Security analysis',
                deliverable_type: 'spike',
                parent_id: null,
                priority: 'high',
                story_points: 5,
                status: 'backlog',
                assignee_id: 'user-1',
                assignee_name: 'John Doe',
                external_id: 'JIRA-123',
                external_url: 'https://jira.example.com/JIRA-123',
                progress_percent: 0,
                started_at: null,
                completed_at: null,
                investigation_id: 'investigation-1',
                props: {},
                created_at: new Date(),
                updated_at: new Date(),
                created_by: 'user-1',
            };
            mockQuery.mockResolvedValueOnce({ rows: [mockRow] });
            const result = await repo.createDeliverable({
                incrementId: 'inc-1',
                goalId: 'goal-1',
                tenantId: 'tenant-1',
                title: 'Investigate security issue',
                description: 'Security analysis',
                deliverableType: 'spike',
                priority: 'high',
                storyPoints: 5,
                assigneeId: 'user-1',
                assigneeName: 'John Doe',
                externalId: 'JIRA-123',
                externalUrl: 'https://jira.example.com/JIRA-123',
                investigationId: 'investigation-1',
            }, 'user-1');
            (0, globals_1.expect)(result.investigationId).toBe('investigation-1');
            (0, globals_1.expect)(result.externalId).toBe('JIRA-123');
            (0, globals_1.expect)(result.goalId).toBe('goal-1');
        });
    });
    (0, globals_1.describe)('listDeliverables', () => {
        (0, globals_1.it)('should list deliverables with filters', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });
            await repo.listDeliverables('inc-1', {
                status: ['in_progress', 'in_review'],
                assigneeId: 'user-1',
            });
            (0, globals_1.expect)(mockQuery).toHaveBeenCalledWith(globals_1.expect.stringContaining('status = ANY'), globals_1.expect.arrayContaining([
                'inc-1',
                ['in_progress', 'in_review'],
                'user-1',
            ]));
        });
    });
    // ===========================================================================
    // TEAM ASSIGNMENT TESTS
    // ===========================================================================
    (0, globals_1.describe)('assignTeamMember', () => {
        (0, globals_1.it)('should assign a team member', async () => {
            const mockRow = {
                id: 'assign-1',
                increment_id: 'inc-1',
                tenant_id: 'tenant-1',
                user_id: 'user-1',
                user_name: 'John Doe',
                user_email: 'john@example.com',
                role: 'contributor',
                allocation_percent: 100,
                props: {},
                created_at: new Date(),
            };
            mockQuery.mockResolvedValueOnce({ rows: [mockRow] });
            const result = await repo.assignTeamMember({
                incrementId: 'inc-1',
                tenantId: 'tenant-1',
                userId: 'user-1',
                userName: 'John Doe',
                userEmail: 'john@example.com',
            });
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.userId).toBe('user-1');
            (0, globals_1.expect)(result.role).toBe('contributor');
        });
        (0, globals_1.it)('should update existing assignment (upsert)', async () => {
            const mockRow = {
                id: 'assign-1',
                increment_id: 'inc-1',
                tenant_id: 'tenant-1',
                user_id: 'user-1',
                user_name: 'John Doe',
                user_email: 'john@example.com',
                role: 'owner',
                allocation_percent: 50,
                props: {},
                created_at: new Date(),
            };
            mockQuery.mockResolvedValueOnce({ rows: [mockRow] });
            const result = await repo.assignTeamMember({
                incrementId: 'inc-1',
                tenantId: 'tenant-1',
                userId: 'user-1',
                userName: 'John Doe',
                userEmail: 'john@example.com',
                role: 'owner',
                allocationPercent: 50,
            });
            (0, globals_1.expect)(result.role).toBe('owner');
            (0, globals_1.expect)(result.allocationPercent).toBe(50);
        });
    });
    (0, globals_1.describe)('removeTeamMember', () => {
        (0, globals_1.it)('should remove a team member', async () => {
            mockQuery.mockResolvedValueOnce({ rowCount: 1 });
            const result = await repo.removeTeamMember('inc-1', 'user-1');
            (0, globals_1.expect)(result).toBe(true);
        });
        (0, globals_1.it)('should return false when member not found', async () => {
            mockQuery.mockResolvedValueOnce({ rowCount: 0 });
            const result = await repo.removeTeamMember('inc-1', 'non-existent');
            (0, globals_1.expect)(result).toBe(false);
        });
    });
    // ===========================================================================
    // METRICS TESTS
    // ===========================================================================
    (0, globals_1.describe)('recordMetricsSnapshot', () => {
        (0, globals_1.it)('should record a metrics snapshot', async () => {
            // Mock getIncrementSummary
            const summaryRow = {
                id: 'inc-1',
                tenant_id: 'tenant-1',
                name: 'Sprint 1',
                description: null,
                version: '1.0.0',
                status: 'active',
                planned_start_date: null,
                planned_end_date: null,
                actual_start_date: null,
                actual_end_date: null,
                planned_capacity_points: 40,
                committed_points: 30,
                completed_points: 15,
                velocity: 10,
                release_notes: null,
                release_tag: null,
                release_url: null,
                props: {},
                created_at: new Date(),
                updated_at: new Date(),
                created_by: 'user-1',
                updated_by: null,
                total_goals: 3,
                completed_goals: 1,
                total_deliverables: 10,
                completed_deliverables: 5,
                in_progress_deliverables: 3,
                blocked_deliverables: 1,
                team_size: 4,
            };
            const snapshotRow = {
                id: 'snap-1',
                increment_id: 'inc-1',
                tenant_id: 'tenant-1',
                snapshot_date: new Date(),
                total_points: 30,
                completed_points: 15,
                remaining_points: 15,
                total_items: 10,
                completed_items: 5,
                in_progress_items: 3,
                blocked_items: 1,
                goals_total: 3,
                goals_completed: 1,
                metrics: { velocity: 10, plannedCapacity: 40 },
                created_at: new Date(),
            };
            mockQuery
                .mockResolvedValueOnce({ rows: [summaryRow] }) // v_increment_summary
                .mockResolvedValueOnce({ rows: [snapshotRow] }); // INSERT
            const result = await repo.recordMetricsSnapshot('inc-1');
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.totalPoints).toBe(30);
            (0, globals_1.expect)(result.completedPoints).toBe(15);
            (0, globals_1.expect)(result.remainingPoints).toBe(15);
        });
        (0, globals_1.it)('should throw when increment not found', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });
            await (0, globals_1.expect)(repo.recordMetricsSnapshot('non-existent')).rejects.toThrow('Increment non-existent not found');
        });
    });
    // ===========================================================================
    // BATCH OPERATIONS TESTS
    // ===========================================================================
    (0, globals_1.describe)('batchByIds', () => {
        (0, globals_1.it)('should return increments in order of requested IDs', async () => {
            const mockRows = [
                {
                    id: 'inc-2',
                    tenant_id: 'tenant-1',
                    name: 'Sprint 2',
                    description: null,
                    version: '1.1.0',
                    status: 'active',
                    planned_start_date: null,
                    planned_end_date: null,
                    actual_start_date: null,
                    actual_end_date: null,
                    planned_capacity_points: 40,
                    committed_points: 0,
                    completed_points: 0,
                    velocity: null,
                    release_notes: null,
                    release_tag: null,
                    release_url: null,
                    props: {},
                    created_at: new Date(),
                    updated_at: new Date(),
                    created_by: 'user-1',
                    updated_by: null,
                },
                {
                    id: 'inc-1',
                    tenant_id: 'tenant-1',
                    name: 'Sprint 1',
                    description: null,
                    version: '1.0.0',
                    status: 'completed',
                    planned_start_date: null,
                    planned_end_date: null,
                    actual_start_date: null,
                    actual_end_date: null,
                    planned_capacity_points: 40,
                    committed_points: 30,
                    completed_points: 30,
                    velocity: 15,
                    release_notes: null,
                    release_tag: null,
                    release_url: null,
                    props: {},
                    created_at: new Date(),
                    updated_at: new Date(),
                    created_by: 'user-1',
                    updated_by: null,
                },
            ];
            mockQuery.mockResolvedValueOnce({ rows: mockRows });
            const result = await repo.batchByIds(['inc-1', 'inc-2', 'inc-3']);
            (0, globals_1.expect)(result).toHaveLength(3);
            (0, globals_1.expect)(result[0]?.id).toBe('inc-1');
            (0, globals_1.expect)(result[1]?.id).toBe('inc-2');
            (0, globals_1.expect)(result[2]).toBeNull(); // inc-3 not found
        });
        (0, globals_1.it)('should return empty array for empty input', async () => {
            const result = await repo.batchByIds([]);
            (0, globals_1.expect)(result).toEqual([]);
            (0, globals_1.expect)(mockQuery).not.toHaveBeenCalled();
        });
    });
});
