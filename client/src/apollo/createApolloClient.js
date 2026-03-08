"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApolloClient = createApolloClient;
const client_1 = require("@apollo/client");
const error_1 = require("@apollo/client/link/error");
const batch_http_1 = require("@apollo/client/link/batch-http");
const retry_1 = require("@apollo/client/link/retry");
const graphql_ws_1 = require("graphql-ws");
const subscriptions_1 = require("@apollo/client/link/subscriptions");
const utilities_1 = require("@apollo/client/utilities");
const persisted_queries_1 = require("@apollo/client/link/persisted-queries");
const context_1 = require("@apollo/client/link/context");
const apollo3_cache_persist_1 = require("apollo3-cache-persist");
const sha256_1 = __importDefault(require("crypto-js/sha256"));
const env_js_1 = require("../config/env.js");
const urls_1 = require("../config/urls");
const API_URL = (0, urls_1.getGraphqlHttpUrl)();
const TENANT = env_js_1.VITE_TENANT_ID || 'dev';
async function createApolloClient() {
    const errorLink = (0, error_1.onError)(({ graphQLErrors, networkError, operation }) => {
        if (graphQLErrors?.length) {
            // minimal console metric stub (dev-only)
            // eslint-disable-next-line no-console
            console.warn('[GQL]', operation.operationName, graphQLErrors);
        }
        if (networkError) {
            // eslint-disable-next-line no-console
            console.error('[NET]', networkError);
        }
    });
    // Retry policy for network errors on idempotent operations
    const retryLink = new retry_1.RetryLink({
        delay: {
            initial: 300,
            max: Infinity,
            jitter: true,
        },
        attempts: {
            max: 2,
            retryIf: (error, _operation) => {
                // Only retry on network errors, not GraphQL errors
                return !!error && !error.result;
            },
        },
    });
    // Auth context with token and tracing
    const authLink = (0, context_1.setContext)((_, { headers }) => {
        const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : '';
        // Generate a W3C traceparent header for end-to-end tracing
        const traceId = crypto.randomUUID().replace(/-/g, '');
        const spanIdArray = new Uint8Array(8);
        crypto.getRandomValues(spanIdArray);
        const spanId = Array.from(spanIdArray, (b) => b.toString(16).padStart(2, '0')).join('');
        const traceparent = `00-${traceId}-${spanId}-01`;
        return {
            headers: {
                ...headers,
                authorization: token ? `Bearer ${token}` : '',
                'x-tenant-id': TENANT,
                traceparent,
            },
        };
    });
    // Persisted queries per APQ; use GET for hashed ops
    const persisted = (0, persisted_queries_1.createPersistedQueryLink)({
        sha256: (s) => (0, sha256_1.default)(s).toString(),
        useGETForHashedQueries: true,
    });
    const http = new batch_http_1.BatchHttpLink({
        uri: API_URL,
        batchMax: 10,
        batchInterval: 20,
        fetchOptions: { mode: 'cors', credentials: 'include' },
    });
    let link = (0, client_1.from)([errorLink, retryLink, authLink, persisted, http]);
    // Subscriptions (if enabled on server)
    try {
        const wsUrl = API_URL.replace('http://', 'ws://').replace('https://', 'wss://');
        const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : '';
        const ws = new subscriptions_1.GraphQLWsLink((0, graphql_ws_1.createClient)({
            url: wsUrl,
            connectionParams: {
                authorization: token ? `Bearer ${token}` : '',
                'x-tenant-id': TENANT,
            },
            retryAttempts: 5,
        }));
        link = (0, client_1.split)(({ query }) => {
            const def = (0, utilities_1.getMainDefinition)(query);
            return (def.kind === 'OperationDefinition' && def.operation === 'subscription');
        }, ws, (0, client_1.from)([errorLink, retryLink, authLink, persisted, http]));
    }
    catch (e) {
        // WebSocket subscriptions optional
        console.warn('WebSocket subscriptions disabled:', e.message);
    }
    const cache = new client_1.InMemoryCache({
        typePolicies: {
            Query: {
                fields: {
                    entities: {
                        keyArgs: ['filter', 'sort', 'tenant'],
                        merge(existing = { items: [] }, incoming) {
                            if (!incoming?.items)
                                return existing;
                            return {
                                ...incoming,
                                items: [...(existing.items || []), ...incoming.items],
                            };
                        },
                    },
                    investigations: {
                        keyArgs: ['after', 'status', 'tenant'],
                        merge(existing, incoming) {
                            if (!incoming)
                                return existing;
                            if (!existing)
                                return incoming;
                            return {
                                ...incoming,
                                edges: [...(existing.edges || []), ...(incoming.edges || [])],
                            };
                        },
                    },
                },
            },
        },
    });
    // Set up offline cache persistence for field work
    if (typeof window !== 'undefined') {
        try {
            await (0, apollo3_cache_persist_1.persistCache)({
                cache,
                storage: new apollo3_cache_persist_1.LocalStorageWrapper(window.localStorage),
                key: `apollo-cache-${TENANT}`,
                trigger: 'write',
                debounce: 1000,
                maxSize: 1024 * 1024 * 10, // 10MB limit
            });
            // Clear cache if it gets corrupted
            if (env_js_1.DEV) {
                // eslint-disable-next-line no-console
                console.log('Apollo cache persistence enabled for tenant:', TENANT);
            }
        }
        catch (error) {
            console.warn('Apollo cache persistence failed:', error);
            // Clear potentially corrupted cache
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem(`apollo-cache-${TENANT}`);
            }
        }
    }
    return new client_1.ApolloClient({
        link,
        cache,
        connectToDevTools: env_js_1.DEV,
        defaultOptions: {
            watchQuery: {
                errorPolicy: 'all',
                fetchPolicy: 'cache-first', // Enable offline-first for field work
            },
            query: {
                errorPolicy: 'all',
                fetchPolicy: 'cache-first',
            },
        },
    });
}
