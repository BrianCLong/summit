import { GraphQLError } from 'graphql';
import { entityResolvers } from './entity.js';
import { investigationResolvers } from './investigation.js';
import { relationshipResolvers } from './relationship.js';

function resolveUnionType(value: any, expected: string): string | undefined {
  if (value?.__typename) {
    return value.__typename;
  }
  if (value && typeof value === 'object') {
    if ('success' in value || 'edges' in value) {
      return undefined;
    }
    if ('code' in value && 'message' in value) {
      return 'ResolverError';
    }
  }
  return expected;
}

export const contractResolvers = {
  Query: {
    ...entityResolvers.Query,
    ...investigationResolvers.Query,
    ...relationshipResolvers.Query,
  },
  Mutation: {
    ...entityResolvers.Mutation,
    ...investigationResolvers.Mutation,
    ...relationshipResolvers.Mutation,
  },
  Entity: entityResolvers.Entity,
  Investigation: investigationResolvers.Investigation,
  EntityResult: {
    __resolveType(obj: unknown) {
      return resolveUnionType(obj, 'Entity');
    },
  },
  InvestigationResult: {
    __resolveType(obj: unknown) {
      return resolveUnionType(obj, 'Investigation');
    },
  },
  EntityMetricsResult: {
    __resolveType(obj: unknown) {
      return resolveUnionType(obj, 'EntityMetrics');
    },
  },
  ResolverError: {
    __isTypeOf(obj: unknown) {
      return Boolean(obj && typeof obj === 'object' && 'code' in (obj as Record<string, unknown>));
    },
  },
  Subscription: {
    entityUpdates: {
      subscribe: () => {
        throw new GraphQLError('Subscriptions are not yet implemented', {
          extensions: { code: 'SUBSCRIPTION_UNAVAILABLE' },
        });
      },
    },
    investigationStatus: {
      subscribe: () => {
        throw new GraphQLError('Subscriptions are not yet implemented', {
          extensions: { code: 'SUBSCRIPTION_UNAVAILABLE' },
        });
      },
    },
  },
};
