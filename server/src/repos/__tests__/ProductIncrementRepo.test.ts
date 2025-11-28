/**
 * Product Increment Repository Tests
 *
 * Comprehensive test suite for ProductIncrementRepo including:
 * - CRUD operations for increments, goals, deliverables
 * - Team assignments
 * - Metrics snapshots
 * - Edge cases and error handling
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock the pg module
const mockQuery = jest.fn();
const mockConnect = jest.fn();
const mockRelease = jest.fn();

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: mockQuery,
    connect: mockConnect,
  })),
}));

// Mock provenance ledger
jest.mock('../../provenance/ledger.js', () => ({
  provenanceLedger: {
    appendEntry: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock logger
jest.mock('../../config/logger.js', () => ({
  default: {
    child: jest.fn().mockReturnValue({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }),
  },
}));

import { Pool } from 'pg';
import {
  ProductIncrementRepo,
  ProductIncrement,
  IncrementGoal,
  Deliverable,
  TeamAssignment,
} from '../ProductIncrementRepo.js';

describe('ProductIncrementRepo', () => {
  let repo: ProductIncrementRepo;
  let mockPool: any;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: mockRelease,
    };
    mockConnect.mockResolvedValue(mockClient);

    mockPool = new Pool();
    repo = new ProductIncrementRepo(mockPool);

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ===========================================================================
  // INCREMENT CRUD TESTS
  // ===========================================================================

  describe('createIncrement', () => {
    it('should create a new increment with required fields', async () => {
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

      const result = await repo.createIncrement(
        {
          tenantId: 'tenant-1',
          name: 'Sprint 1',
          version: '1.0.0',
          plannedCapacityPoints: 40,
        },
        'user-1',
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('test-id');
      expect(result.name).toBe('Sprint 1');
      expect(result.version).toBe('1.0.0');
      expect(result.status).toBe('planning');
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('should create an increment with all optional fields', async () => {
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

      const result = await repo.createIncrement(
        {
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
        },
        'user-1',
      );

      expect(result.description).toBe('First sprint');
      expect(result.plannedStartDate).toEqual(startDate);
      expect(result.plannedEndDate).toEqual(endDate);
      expect(result.releaseTag).toBe('v1.0.0');
    });
  });

  describe('updateIncrement', () => {
    it('should update increment fields', async () => {
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

      const result = await repo.updateIncrement(
        'test-id',
        {
          name: 'Updated Sprint',
          description: 'Updated description',
          status: 'active',
        },
        'user-2',
      );

      expect(result).toBeDefined();
      expect(result!.name).toBe('Updated Sprint');
      expect(result!.status).toBe('active');
      expect(result!.updatedBy).toBe('user-2');
    });

    it('should return existing increment when no fields to update', async () => {
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

      expect(result).toBeDefined();
      expect(result!.name).toBe('Sprint 1');
    });

    it('should return null when increment not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.updateIncrement(
        'non-existent',
        { name: 'New Name' },
        'user-1',
      );

      expect(result).toBeNull();
    });
  });

  describe('deleteIncrement', () => {
    it('should delete an increment successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ tenant_id: 'tenant-1' }] }) // DELETE
        .mockResolvedValueOnce({}); // COMMIT

      const result = await repo.deleteIncrement('test-id', 'user-1');

      expect(result).toBe(true);
      expect(mockClient.query).toHaveBeenCalledTimes(3);
    });

    it('should return false when increment not found', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // DELETE
        .mockResolvedValueOnce({}); // COMMIT

      const result = await repo.deleteIncrement('non-existent', 'user-1');

      expect(result).toBe(false);
    });

    it('should rollback on error', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Delete failed')); // DELETE

      await expect(repo.deleteIncrement('test-id', 'user-1')).rejects.toThrow(
        'Delete failed',
      );

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('findIncrementById', () => {
    it('should find increment by ID', async () => {
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

      expect(result).toBeDefined();
      expect(result!.id).toBe('test-id');
    });

    it('should filter by tenant when provided', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repo.findIncrementById('test-id', 'tenant-1');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND tenant_id = $2'),
        ['test-id', 'tenant-1'],
      );
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findIncrementById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('listIncrements', () => {
    it('should list increments with default pagination', async () => {
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

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('inc-1');
      expect(result[1].id).toBe('inc-2');
    });

    it('should filter by status', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repo.listIncrements({
        tenantId: 'tenant-1',
        filter: { status: 'active' },
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('status = $2'),
        expect.arrayContaining(['tenant-1', 'active']),
      );
    });

    it('should filter by multiple statuses', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repo.listIncrements({
        tenantId: 'tenant-1',
        filter: { status: ['active', 'completed'] },
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('status = ANY($2)'),
        expect.arrayContaining(['tenant-1', ['active', 'completed']]),
      );
    });

    it('should apply search filter', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repo.listIncrements({
        tenantId: 'tenant-1',
        filter: { search: 'Sprint' },
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('name ILIKE'),
        expect.arrayContaining(['tenant-1', '%Sprint%']),
      );
    });
  });

  // ===========================================================================
  // GOAL TESTS
  // ===========================================================================

  describe('createGoal', () => {
    it('should create a goal with required fields', async () => {
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

      const result = await repo.createGoal(
        {
          incrementId: 'inc-1',
          tenantId: 'tenant-1',
          title: 'Implement login',
        },
        'user-1',
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('goal-1');
      expect(result.title).toBe('Implement login');
      expect(result.status).toBe('pending');
    });
  });

  describe('updateGoal', () => {
    it('should update goal status to completed', async () => {
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

      expect(result).toBeDefined();
      expect(result!.status).toBe('completed');
      expect(result!.completionNotes).toBe('Done!');
    });
  });

  // ===========================================================================
  // DELIVERABLE TESTS
  // ===========================================================================

  describe('createDeliverable', () => {
    it('should create a deliverable with required fields', async () => {
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

      const result = await repo.createDeliverable(
        {
          incrementId: 'inc-1',
          tenantId: 'tenant-1',
          title: 'Add login form',
        },
        'user-1',
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('del-1');
      expect(result.title).toBe('Add login form');
      expect(result.status).toBe('backlog');
      expect(result.progressPercent).toBe(0);
    });

    it('should create a deliverable linked to investigation', async () => {
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

      const result = await repo.createDeliverable(
        {
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
        },
        'user-1',
      );

      expect(result.investigationId).toBe('investigation-1');
      expect(result.externalId).toBe('JIRA-123');
      expect(result.goalId).toBe('goal-1');
    });
  });

  describe('listDeliverables', () => {
    it('should list deliverables with filters', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repo.listDeliverables('inc-1', {
        status: ['in_progress', 'in_review'],
        assigneeId: 'user-1',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('status = ANY'),
        expect.arrayContaining([
          'inc-1',
          ['in_progress', 'in_review'],
          'user-1',
        ]),
      );
    });
  });

  // ===========================================================================
  // TEAM ASSIGNMENT TESTS
  // ===========================================================================

  describe('assignTeamMember', () => {
    it('should assign a team member', async () => {
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

      expect(result).toBeDefined();
      expect(result.userId).toBe('user-1');
      expect(result.role).toBe('contributor');
    });

    it('should update existing assignment (upsert)', async () => {
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

      expect(result.role).toBe('owner');
      expect(result.allocationPercent).toBe(50);
    });
  });

  describe('removeTeamMember', () => {
    it('should remove a team member', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const result = await repo.removeTeamMember('inc-1', 'user-1');

      expect(result).toBe(true);
    });

    it('should return false when member not found', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      const result = await repo.removeTeamMember('inc-1', 'non-existent');

      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // METRICS TESTS
  // ===========================================================================

  describe('recordMetricsSnapshot', () => {
    it('should record a metrics snapshot', async () => {
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

      expect(result).toBeDefined();
      expect(result.totalPoints).toBe(30);
      expect(result.completedPoints).toBe(15);
      expect(result.remainingPoints).toBe(15);
    });

    it('should throw when increment not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(repo.recordMetricsSnapshot('non-existent')).rejects.toThrow(
        'Increment non-existent not found',
      );
    });
  });

  // ===========================================================================
  // BATCH OPERATIONS TESTS
  // ===========================================================================

  describe('batchByIds', () => {
    it('should return increments in order of requested IDs', async () => {
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

      expect(result).toHaveLength(3);
      expect(result[0]?.id).toBe('inc-1');
      expect(result[1]?.id).toBe('inc-2');
      expect(result[2]).toBeNull(); // inc-3 not found
    });

    it('should return empty array for empty input', async () => {
      const result = await repo.batchByIds([]);

      expect(result).toEqual([]);
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });
});
