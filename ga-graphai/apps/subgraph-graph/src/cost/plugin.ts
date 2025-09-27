import type { ApolloServerPlugin } from '@apollo/server';
import type { GraphContext } from '../types.js';

export function costExtensionPlugin(): ApolloServerPlugin<GraphContext> {
  return {
    async requestDidStart() {
      return {
        async willSendResponse({ contextValue, response }) {
          const cost = contextValue.costCollector.export();
          if (cost) {
            response.extensions = { ...(response.extensions ?? {}), cost };
          }
        }
      };
    }
  };
}
