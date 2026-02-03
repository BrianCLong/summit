import { jest } from '@jest/globals';

const queryMock = jest.fn();
jest.unstable_mockModule('../../db/postgres.js', () => ({
  getPostgresPool: () => ({
    query: queryMock,
  }),
}));

const { ResidencyGuard, ResidencyViolationError } = await import('../residency-guard.js');

describe('ResidencyGuard', () => {
  let guard: ResidencyGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = ResidencyGuard.getInstance();
  });

  it('should allow access when region is allowed', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          region: 'us-east-1',
          allowed_regions: '["us-west-2"]',
        },
      ],
    });

    await expect(
      guard.enforce('tenant-allowed', {
        operation: 'compute',
        targetRegion: 'us-west-2',
      })
    ).resolves.not.toThrow();
  });

  it('should block access when region is prohibited', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          region: 'us-east-1',
          allowed_regions: '[]',
        },
      ],
    });

    queryMock.mockResolvedValueOnce({ rows: [] }); // checkExceptions

    await expect(
      guard.enforce('tenant-blocked', {
        operation: 'compute',
        targetRegion: 'eu-central-1',
      })
    ).rejects.toThrow(ResidencyViolationError);
  });
});
