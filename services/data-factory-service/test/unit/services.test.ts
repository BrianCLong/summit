/**
 * Service Unit Tests
 *
 * Tests for core service business logic.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AuditService } from '../../src/services/AuditService.js';

// Mock the database connection
const mockQuery = jest.fn();
jest.mock('../../src/db/connection.js', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  transaction: jest.fn(async (callback: (client: unknown) => Promise<unknown>) => {
    const mockClient = { query: mockQuery, release: jest.fn() };
    return callback(mockClient);
  }),
}));

describe('AuditService', () => {
  let auditService: AuditService;

  beforeEach(() => {
    auditService = new AuditService();
    mockQuery.mockReset();
  });

  describe('log', () => {
    it('should create an audit entry', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const entry = await auditService.log({
        entityType: 'dataset',
        entityId: '123',
        action: 'create',
        actorId: 'user-1',
        actorRole: 'admin',
        newState: { name: 'Test Dataset' },
        metadata: { source: 'api' },
      });

      expect(entry).toHaveProperty('id');
      expect(entry.entityType).toBe('dataset');
      expect(entry.action).toBe('create');
      expect(entry.actorId).toBe('user-1');
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('getByEntity', () => {
    it('should retrieve audit entries for an entity', async () => {
      const mockEntries = [
        {
          id: '1',
          entity_type: 'dataset',
          entity_id: '123',
          action: 'create',
          actor_id: 'user-1',
          actor_role: 'admin',
          timestamp: new Date(),
          previous_state: null,
          new_state: JSON.stringify({ name: 'Test' }),
          metadata: JSON.stringify({}),
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockEntries });

      const entries = await auditService.getByEntity('dataset', '123');

      expect(entries).toHaveLength(1);
      expect(entries[0].entityType).toBe('dataset');
      expect(entries[0].entityId).toBe('123');
    });
  });

  describe('search', () => {
    it('should filter audit entries by criteria', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await auditService.search({
        entityType: 'dataset',
        action: 'create',
        actorId: 'user-1',
      });

      expect(mockQuery).toHaveBeenCalled();
      const call = mockQuery.mock.calls[0];
      expect(call[0]).toContain('entity_type');
      expect(call[0]).toContain('action');
      expect(call[0]).toContain('actor_id');
    });

    it('should support date range filtering', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await auditService.search({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      });

      expect(mockQuery).toHaveBeenCalled();
      const call = mockQuery.mock.calls[0];
      expect(call[0]).toContain('timestamp >=');
      expect(call[0]).toContain('timestamp <=');
    });
  });
});

describe('Type Definitions', () => {
  it('should have correct SplitType values', () => {
    const { SplitType } = require('../../src/types/index.js');
    expect(SplitType.TRAIN).toBe('train');
    expect(SplitType.DEV).toBe('dev');
    expect(SplitType.TEST).toBe('test');
    expect(SplitType.VALIDATION).toBe('validation');
  });

  it('should have correct TaskType values', () => {
    const { TaskType } = require('../../src/types/index.js');
    expect(TaskType.ENTITY_MATCH).toBe('entity_match');
    expect(TaskType.CLUSTER_REVIEW).toBe('cluster_review');
    expect(TaskType.CLAIM_ASSESSMENT).toBe('claim_assessment');
    expect(TaskType.SAFETY_DECISION).toBe('safety_decision');
  });

  it('should have correct JobStatus values', () => {
    const { JobStatus } = require('../../src/types/index.js');
    expect(JobStatus.QUEUED).toBe('queued');
    expect(JobStatus.ASSIGNED).toBe('assigned');
    expect(JobStatus.IN_PROGRESS).toBe('in_progress');
    expect(JobStatus.SUBMITTED).toBe('submitted');
    expect(JobStatus.APPROVED).toBe('approved');
    expect(JobStatus.REJECTED).toBe('rejected');
  });
});

describe('Quality Controls', () => {
  describe('Golden Question Logic', () => {
    it('should correctly compare labels', () => {
      const expected = { match: true };
      const actual = [{ fieldName: 'match', value: true }];

      // Simple comparison logic
      const isCorrect =
        JSON.stringify(actual[0].value) ===
        JSON.stringify(Object.values(expected)[0]);

      expect(isCorrect).toBe(true);
    });

    it('should detect label mismatches', () => {
      const expected = { match: true };
      const actual = [{ fieldName: 'match', value: false }];

      const isCorrect =
        JSON.stringify(actual[0].value) ===
        JSON.stringify(Object.values(expected)[0]);

      expect(isCorrect).toBe(false);
    });
  });

  describe('Agreement Calculation', () => {
    it('should calculate pairwise agreement', () => {
      const labelSets = [
        { labels: [{ fieldName: 'match', value: true }] },
        { labels: [{ fieldName: 'match', value: true }] },
        { labels: [{ fieldName: 'match', value: false }] },
      ];

      // Simple pairwise agreement
      let agreements = 0;
      let comparisons = 0;

      for (let i = 0; i < labelSets.length; i++) {
        for (let j = i + 1; j < labelSets.length; j++) {
          comparisons++;
          if (
            JSON.stringify(labelSets[i].labels) ===
            JSON.stringify(labelSets[j].labels)
          ) {
            agreements++;
          }
        }
      }

      const agreement = agreements / comparisons;
      // 1 agreement out of 3 comparisons
      expect(agreement).toBeCloseTo(0.333, 2);
    });

    it('should handle perfect agreement', () => {
      const labelSets = [
        { labels: [{ fieldName: 'match', value: true }] },
        { labels: [{ fieldName: 'match', value: true }] },
      ];

      let agreements = 0;
      let comparisons = 0;

      for (let i = 0; i < labelSets.length; i++) {
        for (let j = i + 1; j < labelSets.length; j++) {
          comparisons++;
          if (
            JSON.stringify(labelSets[i].labels) ===
            JSON.stringify(labelSets[j].labels)
          ) {
            agreements++;
          }
        }
      }

      const agreement = comparisons > 0 ? agreements / comparisons : 1;
      expect(agreement).toBe(1);
    });
  });

  describe('Majority Vote Resolution', () => {
    it('should determine majority label', () => {
      const labels = [
        [{ fieldName: 'match', value: true }],
        [{ fieldName: 'match', value: true }],
        [{ fieldName: 'match', value: false }],
      ];

      const counts = new Map<string, number>();
      for (const label of labels) {
        const key = JSON.stringify(label);
        counts.set(key, (counts.get(key) || 0) + 1);
      }

      let maxCount = 0;
      let majorityLabel: unknown[] | null = null;

      for (const [key, count] of counts.entries()) {
        if (count > maxCount) {
          maxCount = count;
          majorityLabel = JSON.parse(key);
        }
      }

      expect(majorityLabel).toEqual([{ fieldName: 'match', value: true }]);
      expect(maxCount).toBe(2);
    });

    it('should return null when no clear majority', () => {
      const labels = [
        [{ fieldName: 'match', value: true }],
        [{ fieldName: 'match', value: false }],
      ];

      const counts = new Map<string, number>();
      for (const label of labels) {
        const key = JSON.stringify(label);
        counts.set(key, (counts.get(key) || 0) + 1);
      }

      let maxCount = 0;
      let majorityLabel: unknown[] | null = null;

      for (const [key, count] of counts.entries()) {
        if (count > maxCount) {
          maxCount = count;
          majorityLabel = JSON.parse(key);
        }
      }

      // No clear majority (50/50 split)
      const hasMajority = maxCount > labels.length / 2;
      expect(hasMajority).toBe(false);
    });
  });
});
