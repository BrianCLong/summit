import { PubSub } from 'graphql-subscriptions';
import logger from '../../config/logger.js';
import { MLStreamingMonitor } from '../../services/MLStreamingMonitor.js';

interface SubscriptionArgs {
  modelId: string;
}

export function createMLStreamingResolvers(pubsub: PubSub) {
  const monitor = new MLStreamingMonitor(pubsub);

  return {
    Query: {
      mlStreamingStatus: (_parent: unknown, args: SubscriptionArgs) => {
        const status = monitor.getStatus(args.modelId);
        logger.debug({ status }, 'Resolved mlStreamingStatus query');
        return status;
      },
    },
    Subscription: {
      mlInferenceStream: {
        subscribe: (_parent: unknown, args: SubscriptionArgs) => {
          logger.debug({ modelId: args.modelId }, 'Subscribing to ML inference stream');
          return monitor.subscribe(args.modelId);
        },
        resolve: (payload: any) => payload.mlInferenceStream ?? payload,
      },
    },
  };
}

export type MLStreamingResolvers = ReturnType<typeof createMLStreamingResolvers>;
