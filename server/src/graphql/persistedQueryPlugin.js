"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryQueryAllowlistRepository = void 0;
exports.createPersistedQueryPlugin = createPersistedQueryPlugin;
function createPersistedQueryPlugin({ manager, enforceAllowlist = process.env.NODE_ENV === 'production', logger, maxAge = 86400 // 24 hours default
 }) {
    const log = logger || console;
    return {
        async requestDidStart() {
            return {
                async didResolveOperation(requestContext) {
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
                                throw new Error(`Query not in allowlist. Hash: ${sha256Hash.substring(0, 8)}... ` +
                                    `Please submit query for approval.`);
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
                        }
                        else {
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
                    }
                    else if (enforceAllowlist && request.query) {
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
                            throw new Error('Arbitrary queries not allowed in production. ' +
                                `Use persisted queries. Query hash: ${queryHash.substring(0, 8)}...`);
                        }
                    }
                    // Proceed with normal operation resolution
                    return;
                },
                async willSendResponse(requestContext) {
                    const { response, request } = requestContext;
                    // Add debug information if requested
                    if (process.env.DEBUG_PERSISTED_QUERIES === 'true' && response.http) {
                        const extensions = response.extensions || {};
                        extensions.persistedQuery = {
                            enabled: true,
                            enforcementMode: enforceAllowlist ? 'strict' : 'permissive',
                            timestamp: new Date().toISOString()
                        };
                        response.extensions = extensions;
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
class InMemoryQueryAllowlistRepository {
    allowlist = new Set();
    logger = console;
    constructor(initialHashes) {
        if (initialHashes) {
            initialHashes.forEach(hash => this.allowlist.add(hash));
            this.logger.log(`Initialized in-memory allowlist with ${initialHashes.length} queries`);
        }
    }
    async getAllowlist() {
        return this.allowlist;
    }
    async addQueryToAllowlist(queryHash) {
        this.allowlist.add(queryHash);
        this.logger.info(`Added query to allowlist: ${queryHash.substring(0, 8)}...`);
    }
    async removeQueryFromAllowlist(queryHash) {
        this.allowlist.delete(queryHash);
        this.logger.info(`Removed query from allowlist: ${queryHash.substring(0, 8)}...`);
    }
    async isQueryAllowed(queryHash) {
        return this.allowlist.has(queryHash);
    }
    // For testing - clear the allowlist
    clear() {
        this.allowlist.clear();
    }
    // For testing - add multiple queries at once
    addMultiple(hashes) {
        hashes.forEach(hash => this.allowlist.add(hash));
    }
}
exports.InMemoryQueryAllowlistRepository = InMemoryQueryAllowlistRepository;
