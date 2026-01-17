import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import OSINTAggregator from '../../src/services/OSINTAggregator.js';
import { VeracityScoringService } from '../../src/services/VeracityScoringService';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Mock dependencies
jest.mock('../../src/config/database', () => ({
  getNeo4jDriver: jest.fn(),
  getPostgresPool: jest.fn(),
}));

jest.mock('../../src/services/SecureFusionService.js', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    fuse: jest.fn().mockImplementation(async () => ({ ok: true })),
  })),
}));

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
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
    (getNeo4jDriver as jest.Mock).mockReturnValue(mockDriver);
  });

  describe('OSINTAggregator', () => {
    it('should enqueue items with deterministic scoring', async () => {
      const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
      const service = new OSINTAggregator();

      const result = await service.ingest(
        { text: 'nuclear incident', type: 'signal' },
        'satellite-feed-alpha',
      );

      expect(result.status).toBe('queued');
      expect(result.score).toBeGreaterThan(0);
      randomSpy.mockRestore();
    });
  });

  describe('VeracityScoringService', () => {
    it('should calculate veracity score correctly', async () => {
      // Mock Neo4j result for sources
      mockRun.mockImplementationOnce(async () => ({
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
        ],
      }));

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
      mockRun.mockImplementationOnce(async () => ({
        records: [{ get: (key: string) => (key === 'sources' ? [] : {}) }],
      }));

      const service = new VeracityScoringService();
      const result = await service.scoreEntity('entity-empty');

      expect(result.score).toBe(20); // Base score
      expect(result.sources).toBe(0);
    });
  });
});
