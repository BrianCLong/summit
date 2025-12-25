import { withFilter } from 'graphql-subscriptions';

export const ingestionResolvers = {
  Subscription: {
    evidenceIngested: {
      subscribe: withFilter(
        (parent: any, args: any, context: any) => {
            const pubsub = context.pubsub || (context.subscriptionEngine ? context.subscriptionEngine.getPubSub() : null);
            if (!pubsub) throw new Error('PubSub not available');
            return pubsub.asyncIterator(['EVIDENCE_INGESTED']);
        },
        (payload: any, variables: any) => {
          return payload.evidenceIngested.tenantId === variables.tenantId;
        }
      ),
    },
  },
};
