import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { OSINTPrioritizationService } from '../../src/services/OSINTPrioritizationService';
import { VeracityScoringService } from '../../src/services/VeracityScoringService';
import { enqueueOSINT } from '../../src/services/OSINTQueueService';

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
      mockRun.mockResolvedValueOnce({
        records: [
          { get: (key: string) => (key === 'id' ? 'entity-1' : 5) },
          { get: (key: string) => (key === 'id' ? 'entity-2' : 3) },
        ],
      });

      const service = new OSINTPrioritizationService();
      const targets = await service.identifyTargets();

      expect(targets).toEqual(['entity-1', 'entity-2']);
      expect(mockRun).toHaveBeenCalledWith(expect.stringContaining('MATCH (n:Entity)'), expect.any(Object));
    });

    it('should run prioritization cycle and enqueue jobs', async () => {
       // Mock Neo4j result
       mockRun.mockResolvedValueOnce({
        records: [
          { get: (key: string) => (key === 'id' ? 'entity-1' : 5) },
        ],
      });

      const service = new OSINTPrioritizationService();
      await service.runPrioritizationCycle('tenant-1');

      expect(enqueueOSINT).toHaveBeenCalledWith('comprehensive_scan', 'entity-1', { tenantId: 'tenant-1' });
    });
  });

  describe('VeracityScoringService', () => {
    it('should calculate veracity score correctly', async () => {
      // Mock Neo4j result for sources
      mockRun.mockResolvedValueOnce({
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
      });

      const service = new VeracityScoringService();
      const result = await service.scoreEntity('entity-1');

      // avg trust = (0.8 + 0.9 + 0.5) / 3 = 0.7333
      // raw = 73.33 * (1 + log10(3)) = 73.33 * (1 + 0.477) = 73.33 * 1.477 = 108.3
      // capped at 100

      expect(result.score).toBe(100);
      expect(result.confidence).toBe('MEDIUM'); // > 2 sources but not > 5
      expect(mockRun).toHaveBeenCalledTimes(2); // One for query, one for update
    });

    it('should handle no sources', async () => {
      mockRun.mockResolvedValueOnce({
        records: [{ get: (key: string) => (key === 'sources' ? [] : {}) }]
      });

      const service = new VeracityScoringService();
      const result = await service.scoreEntity('entity-empty');

      expect(result.score).toBe(20); // Base score
      expect(result.sources).toBe(0);
    });
  });
});
