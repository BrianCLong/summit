import baseLogger from '../config/logger';
import OrderedPubSub from './ordered-pubsub';
import { validateTenantAccess } from '../middleware/tenantValidator.js';

const logger = baseLogger.child({ name: 'subscriptions' });
export const pubsub = new OrderedPubSub();

// Helper function to extract tenant ID from context
const requireTenant = (context: any): string => {
  const tenantContext = validateTenantAccess(context);
  return tenantContext.tenantId;
};

export const ENTITY_CREATED = 'ENTITY_CREATED';
export const ENTITY_UPDATED = 'ENTITY_UPDATED';
export const ENTITY_DELETED = 'ENTITY_DELETED';
export const RELATIONSHIP_CREATED = 'RELATIONSHIP_CREATED';
export const RELATIONSHIP_UPDATED = 'RELATIONSHIP_UPDATED';
export const RELATIONSHIP_DELETED = 'RELATIONSHIP_DELETED';
export const GRAPH_QUERY_RESULTS = 'GRAPH_QUERY_RESULTS';

export const tenantEvent = (base: string, tenantId: string): string => `${base}_${tenantId}`;

const filterAsyncIterator = <T>(
  iterator: AsyncIterator<T>,
  predicate: (value: T) => boolean | Promise<boolean>,
): AsyncIterator<T> => {
  return {
    async next() {
      while (true) {
        const result = await iterator.next();
        if (result.done) {
          return result;
        }
        if (await predicate(result.value)) {
          return result;
        }
      }
    },
    return() {
      return iterator.return ? iterator.return() : Promise.resolve({ value: undefined, done: true } as any);
    },
    throw(error: any) {
      return iterator.throw ? iterator.throw(error) : Promise.reject(error);
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  };
};

const subscriptionResolvers = {
  Subscription: {
    entityCreated: {
      subscribe: (_: any, __: any, context: any) => {
        const tenantId = requireTenant(context);
        return pubsub.asyncIterator([tenantEvent(ENTITY_CREATED, tenantId)]);
      },
      resolve: (event: any) => {
        const { payload } = event;
        logger.info({ payload }, 'Resolving entityCreated subscription');
        return payload;
      },
    },
    entityUpdated: {
      subscribe: (_: any, __: any, context: any) => {
        const tenantId = requireTenant(context);
        return pubsub.asyncIterator([tenantEvent(ENTITY_UPDATED, tenantId)]);
      },
      resolve: (event: any) => {
        const { payload } = event;
        logger.info({ payload }, 'Resolving entityUpdated subscription');
        return payload;
      },
    },
    entityDeleted: {
      subscribe: (_: any, __: any, context: any) => {
        const tenantId = requireTenant(context);
        return pubsub.asyncIterator([tenantEvent(ENTITY_DELETED, tenantId)]);
      },
      resolve: (event: any) => {
        const { payload } = event;
        logger.info({ payload }, 'Resolving entityDeleted subscription');
        return payload;
      },
    },
    relationshipCreated: {
      subscribe: (_: any, __: any, context: any) => {
        const tenantId = requireTenant(context);
        return pubsub.asyncIterator([tenantEvent(RELATIONSHIP_CREATED, tenantId)]);
      },
      resolve: (event: any) => {
        const { payload } = event;
        logger.info({ payload }, 'Resolving relationshipCreated subscription');
        return payload;
      },
    },
    relationshipUpdated: {
      subscribe: (_: any, __: any, context: any) => {
        const tenantId = requireTenant(context);
        return pubsub.asyncIterator([tenantEvent(RELATIONSHIP_UPDATED, tenantId)]);
      },
      resolve: (event: any) => {
        const { payload } = event;
        logger.info({ payload }, 'Resolving relationshipUpdated subscription');
        return payload;
      },
    },
    relationshipDeleted: {
      subscribe: (_: any, __: any, context: any) => {
        const tenantId = requireTenant(context);
        return pubsub.asyncIterator([tenantEvent(RELATIONSHIP_DELETED, tenantId)]);
      },
      resolve: (event: any) => {
        const { payload } = event;
        logger.info({ payload }, 'Resolving relationshipDeleted subscription');
        return payload;
      },
    },
    graphQueryResults: {
      subscribe: (_: any, args: { requestId: string }, context: any) => {
        const tenantId = requireTenant(context);
        const iterator = pubsub.asyncIterator([tenantEvent(GRAPH_QUERY_RESULTS, tenantId)]);
        return filterAsyncIterator(iterator, async (event: any) => {
          try {
            return event?.payload?.requestId === args.requestId;
          } catch (error) {
            logger.warn({ error }, 'Failed to evaluate graphQueryResults filter predicate');
            return false;
          }
        });
      },
      resolve: (event: any) => {
        const { payload } = event;
        logger.info({ payload }, 'Resolving graphQueryResults subscription');
        return payload;
      },
    },
    // Placeholder for aiRecommendationUpdated
    aiRecommendationUpdated: {
      subscribe: () => pubsub.asyncIterator(['AI_RECOMMENDATION_UPDATED']),
      resolve: (event: any) => {
        const { payload } = event;
        logger.info({ payload }, 'Resolving aiRecommendationUpdated subscription');
        return payload;
      },
    },
  },
};

export default subscriptionResolvers;
