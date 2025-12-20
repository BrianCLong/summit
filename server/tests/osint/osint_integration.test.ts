import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Use require to bypass potential ESM/TS import issues in test environment
const { OSINTPrioritizationService } = require('../../src/services/OSINTPrioritizationService');
const { VeracityScoringService } = require('../../src/services/VeracityScoringService');
const { enqueueOSINT } = require('../../src/services/OSINTQueueService');

// Mock dependencies
jest.mock('../../src/config/database', () => ({
  getNeo4jDriver: jest.fn(),
  getPostgresPool: jest.fn(),
}));

jest.mock('../../src/services/OSINTQueueService', () => ({
  enqueueOSINT: jest.fn(),
  osintQueue: {
    add: jest.fn(),
    getJobCounts: jest.fn(),
  },
  startOSINTWorkers: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

const mockRun = jest.fn();
const mockSession = {
  run: mockRun,
  close: jest.fn(),
};

const mockDriver = {
  session: () => mockSession,
};

const { getNeo4jDriver } = require('../../src/config/database');
(getNeo4jDriver as jest.Mock).mockReturnValue(mockDriver);

describe('OSINT System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('OSINTPrioritizationService', () => {
    it('should identify targets based on graph query', async () => {
      // Mock Neo4j result
      (mockRun as jest.Mock).mockResolvedValueOnce({
        records: [
          { get: (key: string) => (key === 'id' ? 'entity-1' : 5) },
          { get: (key: string) => (key === 'id' ? 'entity-2' : 3) },
        ],
      } as any);

      const service = new OSINTPrioritizationService();
      const targets = await service.identifyTargets();

      expect(targets).toEqual(['entity-1', 'entity-2']);
      expect(mockRun).toHaveBeenCalledWith(expect.stringContaining('MATCH (n:Entity)'), expect.any(Object));
    });

    it('should run prioritization cycle and enqueue jobs', async () => {
       // Mock Neo4j result
       (mockRun as jest.Mock).mockResolvedValueOnce({
        records: [
          { get: (key: string) => (key === 'id' ? 'entity-1' : 5) },
        ],
      } as any);

      const service = new OSINTPrioritizationService();
      await service.runPrioritizationCycle('tenant-1');

      expect(enqueueOSINT).toHaveBeenCalledWith('comprehensive_scan', 'entity-1', { tenantId: 'tenant-1' });
    });
  });

  describe('VeracityScoringService', () => {
    it('should calculate veracity score correctly', async () => {
      // Mock Neo4j result for sources
      (mockRun as jest.Mock).mockResolvedValueOnce({
        records: [
          {
            get: (key: string) => {
               if (key === 'sources') {
                 return [
                   { properties: { trustLevel: 0.8 } },
                   { properties: { type: 'verified' } }, // trust 0.9
                   { properties: { type: 'unknown' } }   // trust 0.5
                 ];
               }
               return {};
            }
          }
        ]
      } as any);

      const service = new VeracityScoringService();
      const result = await service.scoreEntity('entity-1');

      expect(result.score).toBe(100);
      expect(result.confidence).toBe('MEDIUM'); // > 2 sources but not > 5
      expect(mockRun).toHaveBeenCalledTimes(2); // One for query, one for update
    });

    it('should handle no sources', async () => {
      (mockRun as jest.Mock).mockResolvedValueOnce({
        records: [{ get: (key: string) => (key === 'sources' ? [] : {}) }]
      } as any);

      const service = new VeracityScoringService();
      const result = await service.scoreEntity('entity-empty');

      expect(result.score).toBe(20); // Base score
      expect(result.sources).toBe(0);
    });
  });
});
