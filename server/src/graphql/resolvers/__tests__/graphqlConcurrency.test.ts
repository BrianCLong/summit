import { createGraphQLConcurrencyResolvers } from '../graphqlConcurrency';

const adminContext = { user: { id: 'admin', role: 'ADMIN' }, isAuthenticated: true };

describe('graphqlConcurrencyResolvers', () => {
  let service: any;
  let resolvers: ReturnType<typeof createGraphQLConcurrencyResolvers>;

  beforeEach(() => {
    service = {
      getUserLimitOverride: jest.fn(),
      getEffectiveLimit: jest.fn(),
      getDefaultLimit: jest.fn(),
      getActiveCount: jest.fn(),
      setUserLimit: jest.fn(),
      clearUserLimit: jest.fn(),
      setDefaultLimit: jest.fn(),
    };
    resolvers = createGraphQLConcurrencyResolvers(service);
  });

  it('sets a custom limit and returns updated status', async () => {
    service.getUserLimitOverride.mockResolvedValue(3);
    service.getEffectiveLimit.mockResolvedValue(3);
    service.getDefaultLimit.mockResolvedValue(5);
    service.getActiveCount.mockResolvedValue(1);

    const result = await resolvers.Mutation.setGraphQLConcurrencyLimit(
      null,
      { userId: 'user-1', limit: 3 },
      adminContext,
    );

    expect(service.setUserLimit).toHaveBeenCalledWith('user-1', 3);
    expect(result).toEqual({
      userId: 'user-1',
      limit: 3,
      hasCustomLimit: true,
      defaultLimit: 5,
      active: 1,
    });
  });

  it('clears a custom limit', async () => {
    service.getUserLimitOverride.mockResolvedValue(null);
    service.getEffectiveLimit.mockResolvedValue(5);
    service.getDefaultLimit.mockResolvedValue(5);
    service.getActiveCount.mockResolvedValue(0);

    const result = await resolvers.Mutation.clearGraphQLConcurrencyLimit(
      null,
      { userId: 'user-1' },
      adminContext,
    );

    expect(service.clearUserLimit).toHaveBeenCalledWith('user-1');
    expect(result.hasCustomLimit).toBe(false);
    expect(result.limit).toBe(5);
  });

  it('updates the default limit', async () => {
    service.setDefaultLimit.mockResolvedValue(undefined);
    service.getDefaultLimit.mockResolvedValueOnce(10);

    const result = await resolvers.Mutation.setGraphQLConcurrencyDefault(
      null,
      { limit: 10 },
      adminContext,
    );

    expect(service.setDefaultLimit).toHaveBeenCalledWith(10);
    expect(result).toEqual({ defaultLimit: 10 });
  });

  it('exposes status via query', async () => {
    service.getUserLimitOverride.mockResolvedValue(null);
    service.getEffectiveLimit.mockResolvedValue(5);
    service.getDefaultLimit.mockResolvedValue(5);
    service.getActiveCount.mockResolvedValue(2);

    const result = await resolvers.Query.graphqlConcurrencyStatus(
      null,
      { userId: 'user-1' },
      adminContext,
    );

    expect(result).toEqual({
      userId: 'user-1',
      limit: 5,
      hasCustomLimit: false,
      defaultLimit: 5,
      active: 2,
    });
  });

  it('rejects invalid limits', async () => {
    await expect(
      resolvers.Mutation.setGraphQLConcurrencyLimit(null, { userId: 'user-1', limit: 0 }, adminContext),
    ).rejects.toThrow('Concurrency limit must be an integer greater than 0');
  });
});
