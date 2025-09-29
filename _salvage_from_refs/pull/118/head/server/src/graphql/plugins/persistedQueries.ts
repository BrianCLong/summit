import { ApolloServerPlugin } from '@apollo/server';
import persistedManifest from '../../../client/persisted-operations.json'; // Adjust path as needed

// Extract operation IDs from the manifest
const allowedOperationIds = new Set(Object.values(persistedManifest).map((op: any) => op.id));

export const persistedQueriesPlugin: ApolloServerPlugin = {
  async requestDidStart() {
    return {
      async didResolveOperation(ctx) {
        // Only enforce persisted queries if the environment variable is set to '1'
        if (process.env.PERSISTED_QUERIES !== '1') {
          return;
        }

        const opId = ctx.request.http?.headers.get('x-apollo-operation-id');

        if (!opId || !allowedOperationIds.has(opId)) {
          throw new Error('Unknown persisted operation');
        }
      },
    };
  },
};