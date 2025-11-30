
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ForesightService } from '../services/ForesightService';
import * as db from '../../config/database';

// Mock DB
const mockSession = {
  run: jest.fn().mockResolvedValue({ records: [] } as never),
  close: jest.fn().mockResolvedValue(undefined as never)
};

const mockDriver = {
  session: jest.fn(() => mockSession)
};

jest.spyOn(db, 'getNeo4jDriver').mockReturnValue(mockDriver as any);

describe('ForesightService', () => {
  let service: ForesightService;

  beforeEach(() => {
    (ForesightService as any).instance = undefined;
    service = ForesightService.getInstance();
  });

  it('should run simulation and return timeline', async () => {
    const result = await service.runSimulation(
      'Test Scenario',
      { growthRate: 0.1 },
      'tenant-1'
    );

    expect(result.scenario).toBe('Test Scenario');
    expect(result.forecast).toHaveLength(12); // 12 months
    expect(result.forecast[0]).toBeGreaterThan(1.0); // Should grow
  });
});
