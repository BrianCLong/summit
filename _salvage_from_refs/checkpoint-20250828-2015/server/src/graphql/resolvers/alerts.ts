import { PubSub } from 'graphql-subscriptions';
export const pubsub = new PubSub();

export default {
  Subscription: {
    alertStream: {
      subscribe: (_:any, { caseId }:any) => pubsub.asyncIterator(`ALERT:${caseId}`)
    }
  }
};
