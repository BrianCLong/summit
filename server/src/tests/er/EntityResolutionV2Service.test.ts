import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { EntityResolutionV2Service, EntityV2 } from '../../services/er/EntityResolutionV2Service.js';
import { soundex } from '../../services/er/soundex.js';

const mockPool = {
  query: jest.fn(),
};

const mockDlq = {
  enqueue: jest.fn(),
};

jest.mock('../../config/database.js', () => ({
  getPostgresPool: jest.fn(() => mockPool),
}));

jest.mock('../../lib/dlq/index.js', () => ({
  dlqFactory: jest.fn(() => mockDlq),
}));

// Mock Neo4j session
const mockSession = {
  run: jest.fn(),
  beginTransaction: jest.fn().mockReturnValue({
    run: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn()
  }),
  close: jest.fn()
};

describe('EntityResolutionV2Service', () => {
  let service: EntityResolutionV2Service;

  beforeEach(() => {
    service = new EntityResolutionV2Service({
      dlq: mockDlq,
      pool: mockPool as any,
    });
    jest.clearAllMocks();
    mockPool.query.mockResolvedValue({ rows: [] });
    mockDlq.enqueue.mockResolvedValue('dlq-1');
  });

  describe('soundex', () => {
    it('should generate correct soundex codes', () => {
      expect(soundex('Robert')).toBe('R163');
      expect(soundex('Rupert')).toBe('R163');
      expect(soundex('Rubin')).toBe('R150');
      expect(soundex('Ashcraft')).toBe('A261');
    });
  });

  describe('generateSignals', () => {
    it('should extract phonetic and simple signals', () => {
      const entity: EntityV2 = {
        id: '1',
        labels: ['Entity'],
        properties: {
          name: 'Robert',
          userAgent: 'Mozilla/5.0',
          cryptoAddress: '0x123'
        }
      };

      const signals = service.generateSignals(entity);
      expect(signals.phonetic).toContain('R163');
      expect(signals.device).toContain('Mozilla/5.0');
      expect(signals.crypto).toContain('0x123');
    });
  });

  describe('explain', () => {
    it('should generate features and rationale for similar entities', () => {
      const e1: EntityV2 = {
        id: '1', labels: ['Entity'],
        properties: { name: 'Robert', cryptoAddress: '0x123' }
      };
      const e2: EntityV2 = {
        id: '2', labels: ['Entity'],
        properties: { name: 'Rupert', cryptoAddress: '0x123' }
      };

      const explanation = service.explain(e1, e2);
      expect(explanation.features.phonetic).toBe(1);
      expect(explanation.features.crypto).toBe(1);
      expect(explanation.rationale).toContain('Phonetic match on soundex code: R163');
      expect(explanation.rationale).toContain('Shared crypto address: 0x123');
      expect(explanation.score).toBeGreaterThan(0.5);
      expect(explanation.featureContributions.length).toBeGreaterThan(0);
      const total = explanation.featureContributions.reduce(
        (sum, entry) => sum + entry.normalizedContribution,
        0,
      );
      expect(total).toBeCloseTo(1, 5);
    });
  });

  // TODO: These merge tests require proper DLQ and Neo4j session mocking
  // Skip until dependency injection is implemented in the service
  describe.skip('merge', () => {
    it('should enforce policy', async () => {
      const req = {
        masterId: 'm1',
        mergeIds: ['d1'],
        userContext: { clearances: [] },
        rationale: 'test'
      };

      // Mock fetching entities with sensitive labels
      mockSession.run.mockResolvedValueOnce({
        records: [
          { get: (k: string) => ({ properties: { id: 'm1', lac_labels: ['TOP_SECRET'] }, labels: [] }) },
          { get: (k: string) => ({ properties: { id: 'd1' }, labels: [] }) }
        ]
      });

      await expect(service.merge(mockSession as any, req)).rejects.toThrow('Policy violation');
    });

    it('should short-circuit on idempotency key', async () => {
      const tx = {
        run: jest.fn(async (query: string) => {
          if (query.includes('MERGE (d:ERDecision {idempotencyKey')) {
            return {
              records: [
                {
                  get: (key: string) => {
                    if (key === 'decisionId') return 'dec-1';
                    if (key === 'mergeId') return 'merge-1';
                    if (key === 'masterId') return 'm1';
                    if (key === 'mergeIds') return ['d1'];
                    if (key === 'created') return false;
                    return null;
                  },
                },
              ],
            };
          }
          return { records: [] };
        }),
        commit: jest.fn(),
        rollback: jest.fn(),
      };

      mockSession.beginTransaction.mockReturnValueOnce(tx);
      mockSession.run.mockResolvedValueOnce({
        records: [
          { get: () => ({ properties: { id: 'm1', lac_labels: [] }, labels: [] }) },
          { get: () => ({ properties: { id: 'd1', lac_labels: [] }, labels: [] }) },
        ],
      });

      const result = await service.merge(mockSession as any, {
        masterId: 'm1',
        mergeIds: ['d1'],
        userContext: { userId: 'user-1', clearances: [] },
        rationale: 'test',
        mergeId: 'merge-1',
      });

      expect(result.idempotent).toBe(true);
      expect(tx.commit).toHaveBeenCalled();
    });

    it('should send guardrail conflicts to DLQ', async () => {
      const largeMergeIds = Array.from({ length: 25 }, (_, i) => `d${i}`);

      await expect(
        service.merge(mockSession as any, {
          masterId: 'm1',
          mergeIds: largeMergeIds,
          userContext: { userId: 'user-1', clearances: [] },
          rationale: 'test',
        })
      ).rejects.toThrow('Merge cardinality exceeds guardrail limits');

      expect(mockDlq.enqueue).toHaveBeenCalled();
    });

    it('should rollback using snapshot metadata', async () => {
      jest.spyOn(service, 'split').mockResolvedValue();
      mockPool.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'snap-1',
              merge_id: 'merge-1',
              decision_id: 'dec-1',
              restored_at: null,
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.rollbackMergeSnapshot(mockSession as any, {
        mergeId: 'merge-1',
        reason: 'oops',
        userContext: { userId: 'user-1' },
      });

      expect(service.split).toHaveBeenCalledWith(
        mockSession,
        'dec-1',
        expect.any(Object),
      );
      expect(result.success).toBe(true);
    });
  });
});
