import { AnalyticsService } from '../AnalyticsService.js';
import { jest } from '@jest/globals';

// Mock runCypher
jest.mock('../../graph/neo4j.js', () => ({
  runCypher: jest.fn(),
  getDriver: jest.fn().mockReturnValue({
    session: jest.fn().mockReturnValue({
      run: jest.fn(),
      close: jest.fn()
    })
  })
}));

import { runCypher } from '../../graph/neo4j.js';
const runCypherMock = runCypher as any;

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(() => {
    service = AnalyticsService.getInstance();
    runCypherMock.mockClear();
  });

  describe('findPaths', () => {
    it('should calculate shortest paths correctly', async () => {
      const mockResult = [
        { nodeIds: ['1', '2'], relTypes: ['CONNECTED'], cost: 1 }
      ];
      runCypherMock.mockResolvedValue(mockResult);

      const result = await service.findPaths('1', '2', 'shortest');

      expect(runCypher).toHaveBeenCalledWith(
        expect.stringContaining('shortestPath'),
        expect.objectContaining({ sourceId: '1', targetId: '2' })
      );
      expect(result.data).toEqual(mockResult);
      expect(result.xai.explanation).toContain('unweighted shortest path');
    });

    it('should validate inputs', async () => {
        await expect(service.findPaths('1', '2', 'shortest', { k: 'invalid' }))
            .rejects.toThrow();
    });
  });

  describe('detectCommunities', () => {
    it('should return community detection results via client-side components', async () => {
      const mockNodes = [
          { nodeId: '1', neighbors: ['2'] },
          { nodeId: '2', neighbors: ['1'] },
          { nodeId: '3', neighbors: [] }
      ];
      runCypherMock.mockResolvedValue(mockNodes);

      const result = await service.detectCommunities('lpa');

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.xai.metrics.communityCount).toBe(2); // {1,2} and {3}
    });
  });

  describe('minePatterns', () => {
    it('should find temporal motifs', async () => {
      const mockResult = [{ nodeId: '1', eventCount: 10 }];
      runCypherMock.mockResolvedValue(mockResult);

      const result = await service.minePatterns('temporal-motifs');

      expect(runCypher).toHaveBeenCalledWith(
        expect.stringContaining('timestamp'),
        expect.anything()
      );
      expect(result.xai.features.patternType).toBe('temporal-motifs');
    });
  });

  describe('detectAnomalies', () => {
      it('should detect degree anomalies', async () => {
          runCypherMock.mockResolvedValue([{ nodeId: '1', degree: 100 }]);

          const result = await service.detectAnomalies('degree');

          expect(runCypher).toHaveBeenCalledWith(
              expect.stringContaining('degree > 50'),
              expect.anything()
          );
          expect(result.xai.explanation).toContain('Nodes exceeding');
      });
  });
});
