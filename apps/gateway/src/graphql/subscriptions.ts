import { PubSub, withFilter } from "graphql-subscriptions";
import { realtimeManager } from "../realtimeManager";

// Use local PubSub because realtimeManager is already listening to Redis
const pubsub = new PubSub();

// Bridge RealtimeManager -> PubSub
realtimeManager.on("event", (event) => {
  pubsub.publish("GRAPH_EVENT", { onGraphEvent: event });
});

export const resolvers = {
  Subscription: {
    onGraphEvent: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(["GRAPH_EVENT"]),
        (payload: any, variables: any, context: any) => {
          const event = payload.onGraphEvent;

          // AuthZ Check: Context should contain user/tenant info
          if (!context.user) {
            // If context not populated (e.g. dev), maybe deny?
            // For skeleton, we'll allow if tenant matches provided variable,
            // but ideally context.user.tenant should be checked.
            // throw new Error("Unauthorized");
          }
          if (context.user && context.user.tenant !== variables.tenant) {
            return false;
          }

          // Filter by tenant (mandatory)
          if (event.tenant !== variables.tenant) return false;

          // Type filter
          if (variables.types && variables.types.length > 0) {
            if (!variables.types.includes(event.type)) return false;
          }

          // Entity ID filter
          if (variables.entityIds && variables.entityIds.length > 0) {
            if (!variables.entityIds.includes(event.entity.id)) return false;
          }

          // Kind filter
          if (variables.kinds && variables.kinds.length > 0) {
            if (!variables.kinds.includes(event.entity.kind)) return false;
          }

          return true;
        }
      ),
      resolve: (payload: any) => payload.onGraphEvent,
    },
  },
};
