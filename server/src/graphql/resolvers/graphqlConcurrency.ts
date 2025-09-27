import { GraphQLError } from 'graphql';
import { requireRole } from '../../lib/auth.js';
import { GraphQLConcurrencyService } from '../../services/graphqlConcurrencyService.js';

function assertPositiveLimit(limit: number): void {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new GraphQLError('Concurrency limit must be an integer greater than 0');
  }
}

export function createGraphQLConcurrencyResolvers(
  service: GraphQLConcurrencyService = new GraphQLConcurrencyService(),
) {
  async function buildStatus(userId: string) {
    const [override, effectiveLimit, defaultLimit, active] = await Promise.all([
      service.getUserLimitOverride(userId),
      service.getEffectiveLimit(userId),
      service.getDefaultLimit(),
      service.getActiveCount(userId),
    ]);

    return {
      userId,
      limit: effectiveLimit,
      hasCustomLimit: override !== null,
      defaultLimit,
      active,
    };
  }

  return {
    Query: {
      graphqlConcurrencyStatus: async (_: unknown, args: { userId: string }, ctx: any) => {
        requireRole(ctx, 'ADMIN');
        return buildStatus(args.userId);
      },
      graphqlConcurrencyDefaults: async (_: unknown, __: unknown, ctx: any) => {
        requireRole(ctx, 'ADMIN');
        const defaultLimit = await service.getDefaultLimit();
        return { defaultLimit };
      },
    },
    Mutation: {
      setGraphQLConcurrencyLimit: async (
        _: unknown,
        args: { userId: string; limit: number },
        ctx: any,
      ) => {
        requireRole(ctx, 'ADMIN');
        assertPositiveLimit(args.limit);
        await service.setUserLimit(args.userId, args.limit);
        return buildStatus(args.userId);
      },
      clearGraphQLConcurrencyLimit: async (_: unknown, args: { userId: string }, ctx: any) => {
        requireRole(ctx, 'ADMIN');
        await service.clearUserLimit(args.userId);
        return buildStatus(args.userId);
      },
      setGraphQLConcurrencyDefault: async (
        _: unknown,
        args: { limit: number },
        ctx: any,
      ) => {
        requireRole(ctx, 'ADMIN');
        assertPositiveLimit(args.limit);
        await service.setDefaultLimit(args.limit);
        const defaultLimit = await service.getDefaultLimit();
        return { defaultLimit };
      },
    },
  };
}

export const graphqlConcurrencyResolvers = createGraphQLConcurrencyResolvers();

export default graphqlConcurrencyResolvers;
