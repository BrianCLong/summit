// server/src/graphql/persistedQueryPlugin.ts
import { ApolloServerPlugin, GraphQLRequestContext, GraphQLResponse } from '@apollo/server';
import { PersistedQueryManager, PersistedQueryRepository } from './persistedQueries.js';
import { Logger } from '../utils/logger.js';

export interface PersistedQueryPluginConfig {
  manager: PersistedQueryManager;
  enforceAllowlist?: boolean;
  logger?: Logger;
  maxAge?: number; // TTL in seconds for persisted queries in cache
}

export function createPersistedQueryPlugin({
  manager,
  enforceAllowlist = process.env.NODE_ENV === 'production',
  logger,
  maxAge = 86400 // 24 hours default
}: PersistedQueryPluginConfig): ApolloServerPlugin {
  const log = logger || console;

  return {
    async requestDidStart() {
      return {
        async didResolveOperation(requestContext: GraphQLRequestContext<any>) {
          const { request, operation } = requestContext;
          const extensions = request.extensions;

          // Check for persisted query protocol
          if (extensions?.persistedQuery) {
            const { sha256Hash, version } = extensions.persistedQuery;

            // Verify format
            if (!sha256Hash || typeof sha256Hash !== 'string') {
              throw new Error('Invalid persisted query hash format');
            }

            if (version != null && version !== 1) {
              throw new Error(`Unsupported persisted query version: ${version}`);
            }

            // In production mode: check if query is in allowlist
            if (enforceAllowlist) {
              const isAllowed = await manager.isQueryAllowed(sha256Hash);

              if (!isAllowed) {
                log.error(`Blocked unauthorized query attempt`, {
                  queryHash: sha256Hash,
                  operationName: request.operationName,
                  context: requestContext.contextValue
                });

                throw new Error(
                  `Query not in allowlist. Hash: ${sha256Hash.substring(0, 8)}... ` +
                  `Please submit query for approval.`
                );
              }
            }

            // If this is a new request with a hash but no body, try to get the body
            if (!request.query) {
              log.debug(`Fetching persisted query for hash: ${sha256Hash.substring(0, 8)}...`);

              const cachedQuery = await manager.getPersistedQuery(sha256Hash);

              if (!cachedQuery) {
                log.warn(`Persisted query not found for hash: ${sha256Hash.substring(0, 8)}...`);
                throw new Error('PersistedQueryNotFound');
              }

              // Set the query in the request
              request.query = cachedQuery;
            } else {
              // This is a new persisted query - store it for future use
              // Verify the hash matches the provided query
              const expectedHash = manager.generateQueryHash(request.query);

              if (expectedHash !== sha256Hash) {
                log.error(`Query hash mismatch`, {
                  expected: expectedHash,
                  received: sha256Hash,
                  query: request.query.substring(0, 200)
                });

                throw new Error('PersistedQueryHashMismatch');
              }

              // Store the new query
              await manager.persistQuery(sha256Hash, request.query);
              log.info(`Stored new persisted query`, {
                queryHash: sha256Hash.substring(0, 8),
                operationName: request.operationName
              });
            }
          } else if (enforceAllowlist && request.query) {
            // Production mode with allowlist enforcement: require persisted queries
            // Check if this query exists in the allowlist by hashing it
            const queryHash = manager.generateQueryHash(request.query);
            const isAllowed = await manager.isQueryAllowed(queryHash);

            if (!isAllowed) {
              log.error(`Arbitrary query blocked in production mode`, {
                queryHash: queryHash.substring(0, 8),
                operationName: request.operationName,
                queryPreview: request.query.substring(0, 200)
              });

              throw new Error(
                'Arbitrary queries not allowed in production. ' +
                `Use persisted queries. Query hash: ${queryHash.substring(0, 8)}...`
              );
            }
          }

          // Proceed with normal operation resolution
          return;
        },

        async willSendResponse(requestContext: GraphQLRequestContext<any>) {
          const { response, request } = requestContext;

          // Add debug information if requested
          if (process.env.DEBUG_PERSISTED_QUERIES === 'true' && response.http) {
            const extensions = (response as any).extensions || {};
            extensions.persistedQuery = {
              enabled: true,
              enforcementMode: enforceAllowlist ? 'strict' : 'permissive',
              timestamp: new Date().toISOString()
            };
            (response as any).extensions = extensions;
          }
        }
      };
    },

    async serverWillStart() {
      return {
        async drainServer() {
          log.info('Draining persisted query resources...');
          // Perform any cleanup if needed
        }
      };
    }
  };
}

// Create a memory-based repository for simple deployment
export class InMemoryQueryAllowlistRepository implements PersistedQueryRepository {
  private allowlist = new Set<string>();
  private logger = console;

  constructor(initialHashes?: string[]) {
    if (initialHashes) {
      initialHashes.forEach(hash => this.allowlist.add(hash));
      this.logger.log(`Initialized in-memory allowlist with ${initialHashes.length} queries`);
    }
  }

  async getAllowlist(): Promise<Set<string>> {
    return this.allowlist;
  }

  async addQueryToAllowlist(queryHash: string): Promise<void> {
    this.allowlist.add(queryHash);
    this.logger.info(`Added query to allowlist: ${queryHash.substring(0, 8)}...`);
  }

  async removeQueryFromAllowlist(queryHash: string): Promise<void> {
    this.allowlist.delete(queryHash);
    this.logger.info(`Removed query from allowlist: ${queryHash.substring(0, 8)}...`);
  }

  async isQueryAllowed(queryHash: string): Promise<boolean> {
    return this.allowlist.has(queryHash);
  }

  // For testing - clear the allowlist
  clear(): void {
    this.allowlist.clear();
  }

  // For testing - add multiple queries at once
  addMultiple(hashes: string[]): void {
    hashes.forEach(hash => this.allowlist.add(hash));
  }
}