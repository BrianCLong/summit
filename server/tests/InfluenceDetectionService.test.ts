
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { InfluenceDetectionService } from '../src/services/InfluenceDetectionService.js';
import { runCypher } from '../src/graph/neo4j.js';

jest.mock('../src/graph/neo4j.js', () => ({
  runCypher: jest.fn(),
  getDriver: jest.fn()
}));

describe('InfluenceDetectionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should detect bots based on heuristics', async () => {
    const mockBots = [
      { id: '1', name: 'Bot1', ratio: 10.0 }
    ];
    (runCypher as any).mockResolvedValue(mockBots);

    const result = await InfluenceDetectionService.detectBots('tenant-1');

    expect(runCypher).toHaveBeenCalledWith(
      expect.stringContaining('ratio > 5.0'),
      expect.objectContaining({ tenantId: 'tenant-1' })
    );
    expect(result).toEqual(mockBots);
  });

  it('should detect coordinated behavior', async () => {
    const mockCoordination = [
      { actor1: 'A', actor2: 'B', sharedTargets: 5 }
    ];
    (runCypher as any).mockResolvedValue(mockCoordination);

    const result = await InfluenceDetectionService.detectCoordinatedBehavior('tenant-1', 30);

    expect(runCypher).toHaveBeenCalledWith(
      expect.stringContaining('duration.inSeconds'),
      expect.objectContaining({ tenantId: 'tenant-1', timeWindowMinutes: 30 })
    );
    expect(result).toEqual(mockCoordination);
  });
});
