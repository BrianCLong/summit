
import { describe, it, expect, jest, beforeEach, beforeAll } from '@jest/globals';

// Mock DB
const mockSession = {
  run: jest.fn().mockResolvedValue({ records: [] } as never),
  close: jest.fn().mockResolvedValue(undefined as never)
};

const mockDriver = {
  session: jest.fn(() => mockSession)
};

let ForesightService: typeof import('../services/ForesightService').ForesightService;

describe('ForesightService', () => {
  let service: ReturnType<typeof ForesightService.getInstance>;

  beforeAll(async () => {
    const dbSpec = '../../config/database.ts';
    jest.resetModules();
    // @ts-ignore - unstable API is sufficient for tests
    await (jest as any).unstable_mockModule(dbSpec, () => ({
      getNeo4jDriver: () => mockDriver,
    }));
    ({ ForesightService } = await import('../services/ForesightService.ts'));
  });

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
