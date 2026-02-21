import { jest, describe, it, expect } from '@jest/globals';

// Use unstable_mockModule for ESM mocking
jest.unstable_mockModule('../SynonymService.js', () => ({
  synonymService: {
    expandQuery: (q: string) => q,
  },
}));

jest.unstable_mockModule('../EmbeddingService.js', () => ({
  default: class MockEmbeddingService {
    generateEmbedding() {
      return Promise.resolve([0.1, 0.2, 0.3]);
    }
  }
}));

jest.unstable_mockModule('pino', () => ({
  default: () => ({
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  })
}));

describe('SemanticSearchService', () => {
  it('should use parameterized query for LIMIT to prevent SQL injection', async () => {
    const { default: SemanticSearchService } = await import('../SemanticSearchService.js');

    const mockQuery = jest.fn().mockResolvedValue({ rows: [] });
    const mockConnect = jest.fn().mockResolvedValue({
      query: mockQuery,
      release: jest.fn(),
    });

    const mockPool = {
      connect: mockConnect,
      query: mockQuery,
      ended: false,
      end: jest.fn(),
    };

    const service = new SemanticSearchService({
      pool: mockPool as any,
      healthCheckIntervalMs: Number.MAX_SAFE_INTEGER,
    });

    const maliciousLimit = "20; DROP TABLE users; --";

    await service.searchCases('test query', {}, maliciousLimit as any);

    expect(mockQuery).toHaveBeenCalled();

    const lastCall = mockQuery.mock.calls[0];
    const sql = lastCall[0] as string;
    const params = lastCall[1] as any[];

    // Verify SQL uses parameter for LIMIT
    expect(sql).toMatch(/LIMIT \$\d+/);
    expect(sql).not.toContain('DROP TABLE');

    // Verify the parameter value is parsed correctly (should be 20)
    // "20; DROP..." parsed as int is 20
    const limitParam = params[params.length - 1];
    expect(limitParam).toBe(20);
  });

  it('should use default limit if input is invalid', async () => {
    const { default: SemanticSearchService } = await import('../SemanticSearchService.js');

    const mockQuery = jest.fn().mockResolvedValue({ rows: [] });
    const mockConnect = jest.fn().mockResolvedValue({
      query: mockQuery,
      release: jest.fn(),
    });

    const mockPool = {
      connect: mockConnect,
      query: mockQuery,
      ended: false,
      end: jest.fn(),
    };

    const service = new SemanticSearchService({
      pool: mockPool as any,
      healthCheckIntervalMs: Number.MAX_SAFE_INTEGER,
    });

    const invalidLimit = "invalid";

    await service.searchCases('test query', {}, invalidLimit as any);

    const lastCall = mockQuery.mock.calls[0];
    const params = lastCall[1] as any[];

    // Should default to 20
    const limitParam = params[params.length - 1];
    expect(limitParam).toBe(20);
  });
});
