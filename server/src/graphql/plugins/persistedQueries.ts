import type { ApolloServerPlugin } from '@apollo/server';
import { persistedQueryService } from '../persisted-query-service.js';

export const persistedQueriesPlugin: ApolloServerPlugin = {
  async requestDidStart() {
    return {
      async didResolveSource(ctx) {
        // Support standard APQ extensions
        const extensions = ctx.request.extensions;
        const pq = extensions?.persistedQuery as { version: number, sha256Hash: string } | undefined;
        // Support legacy header
        const opId = ctx.request.http?.headers.get('x-apollo-operation-id');

        const id = pq?.sha256Hash || opId;

        if (id) {
            const storedQuery = await persistedQueryService.get(id);
            if (storedQuery) {
                ctx.request.query = storedQuery;
            } else if (!ctx.request.query) {
                // If we don't have the query text and it's not in cache, we can't proceed.
                // Standard APQ error code is PersistedQueryNotFound
                throw new Error('PersistedQueryNotFound');
            }
        }
      },
      async didResolveOperation(ctx) {
        // Enforce whitelist in production if configured
        if (
          process.env.PERSISTED_QUERIES === '1' ||
          (process.env.NODE_ENV === 'production' && !process.env.ALLOW_ADHOC_QUERIES)
        ) {
           // We expect that the query came from our persisted storage
           // But didResolveSource runs before this.
           // If the client sent the full query, didResolveSource passes.
           // How do we ensure it WAS persisted?
           // We can check if the ID exists in service.

           const extensions = ctx.request.extensions;
           const pq = extensions?.persistedQuery as { version: number, sha256Hash: string } | undefined;
           const opId = ctx.request.http?.headers.get('x-apollo-operation-id');
           const id = pq?.sha256Hash || opId;

           if (!id) {
               throw new Error('PersistedQueryRequired');
           }

           // Verify it exists in our registry
           const stored = await persistedQueryService.get(id);
           if (!stored) {
               // Even if they sent the full query, if we are in strict mode, we might reject if not registered.
               // "Persisted query registration (admin)" implies strict control.
               throw new Error('Unknown persisted operation');
           }
        }
      },
    };
  },
};
