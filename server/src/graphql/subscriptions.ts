import pino from 'pino';
import OrderedPubSub from './ordered-pubsub';

const logger = pino();
export const pubsub = new OrderedPubSub();

export const ENTITY_CREATED = 'ENTITY_CREATED';
export const ENTITY_UPDATED = 'ENTITY_UPDATED';
export const ENTITY_DELETED = 'ENTITY_DELETED';
export const RELATIONSHIP_CREATED = 'RELATIONSHIP_CREATED';
export const RELATIONSHIP_UPDATED = 'RELATIONSHIP_UPDATED';
export const RELATIONSHIP_DELETED = 'RELATIONSHIP_DELETED';

const subscriptionResolvers = {
  Subscription: {
    entityCreated: {
      subscribe: () => pubsub.asyncIterator([ENTITY_CREATED]),
      resolve: (event: any) => {
        const { payload } = event;
        logger.info({ payload }, 'Resolving entityCreated subscription');
        return payload;
      },
    },
    entityUpdated: {
      subscribe: () => pubsub.asyncIterator([ENTITY_UPDATED]),
      resolve: (event: any) => {
        const { payload } = event;
        logger.info({ payload }, 'Resolving entityUpdated subscription');
        return payload;
      },
    },
    entityDeleted: {
      subscribe: () => pubsub.asyncIterator([ENTITY_DELETED]),
      resolve: (event: any) => {
        const { payload } = event;
        logger.info({ payload }, 'Resolving entityDeleted subscription');
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