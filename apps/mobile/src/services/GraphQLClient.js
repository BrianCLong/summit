"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.persistApolloCache = exports.resetApolloClient = exports.getApolloClient = exports.initializeApolloClient = void 0;
const client_1 = require("@apollo/client");
const utilities_1 = require("@apollo/client/utilities");
const subscriptions_1 = require("@apollo/client/link/subscriptions");
const graphql_ws_1 = require("graphql-ws");
const context_1 = require("@apollo/client/link/context");
const error_1 = require("@apollo/client/link/error");
const retry_1 = require("@apollo/client/link/retry");
const apollo3_cache_persist_1 = require("apollo3-cache-persist");
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const netinfo_1 = __importDefault(require("@react-native-community/netinfo"));
const config_1 = require("@/config");
const AuthService_1 = require("./AuthService");
const OfflineQueueService_1 = require("./OfflineQueueService");
let apolloClient = null;
// HTTP Link for queries and mutations
const httpLink = new client_1.HttpLink({
    uri: config_1.API_CONFIG.graphqlUrl,
    credentials: 'include',
});
// WebSocket Link for subscriptions
const createWsLink = () => new subscriptions_1.GraphQLWsLink((0, graphql_ws_1.createClient)({
    url: config_1.API_CONFIG.wsUrl,
    connectionParams: async () => {
        const token = await (0, AuthService_1.getAuthToken)();
        return {
            authorization: token ? `Bearer ${token}` : '',
        };
    },
    retryAttempts: 5,
    shouldRetry: () => true,
    on: {
        connected: () => console.log('[GraphQL WS] Connected'),
        closed: () => console.log('[GraphQL WS] Closed'),
        error: (error) => console.error('[GraphQL WS] Error:', error),
    },
}));
// Auth Link - Add auth token to requests
const authLink = (0, context_1.setContext)(async (_, { headers }) => {
    const token = await (0, AuthService_1.getAuthToken)();
    return {
        headers: {
            ...headers,
            authorization: token ? `Bearer ${token}` : '',
            'x-client-version': '1.0.0',
            'x-platform': 'mobile',
        },
    };
});
// Error Link - Handle errors globally
const errorLink = (0, error_1.onError)(({ graphQLErrors, networkError, operation, forward }) => {
    if (graphQLErrors) {
        for (const error of graphQLErrors) {
            console.error(`[GraphQL error]: Message: ${error.message}, Path: ${error.path}`);
            // Handle authentication errors
            if (error.extensions?.code === 'UNAUTHENTICATED' ||
                error.message.includes('Unauthorized') ||
                error.message.includes('Not authenticated')) {
                // Try to refresh token
                (0, AuthService_1.refreshAuthToken)()
                    .then((newToken) => {
                    if (newToken) {
                        // Retry the operation with new token
                        const oldHeaders = operation.getContext().headers;
                        operation.setContext({
                            headers: {
                                ...oldHeaders,
                                authorization: `Bearer ${newToken}`,
                            },
                        });
                        return forward(operation);
                    }
                    else {
                        (0, AuthService_1.clearAuthToken)();
                    }
                })
                    .catch(() => {
                    (0, AuthService_1.clearAuthToken)();
                });
            }
        }
    }
    if (networkError) {
        console.error(`[Network error]: ${networkError}`);
        // Check if offline and queue mutation
        netinfo_1.default.fetch().then((state) => {
            if (!state.isConnected) {
                const definition = (0, utilities_1.getMainDefinition)(operation.query);
                if (definition.kind === 'OperationDefinition' &&
                    definition.operation === 'mutation') {
                    (0, OfflineQueueService_1.queueOfflineMutation)(operation);
                }
            }
        });
    }
});
// Retry Link - Retry failed requests
const retryLink = new retry_1.RetryLink({
    delay: {
        initial: 300,
        max: 5000,
        jitter: true,
    },
    attempts: {
        max: 3,
        retryIf: (error, _operation) => {
            // Don't retry auth errors
            if (error?.message?.includes('Unauthorized'))
                return false;
            return !!error;
        },
    },
});
// Create cache with type policies
const createCache = () => new client_1.InMemoryCache({
    typePolicies: {
        Query: {
            fields: {
                entities: {
                    keyArgs: ['filter', 'search', 'type'],
                    merge(existing = { edges: [] }, incoming) {
                        return {
                            ...incoming,
                            edges: [...existing.edges, ...incoming.edges],
                        };
                    },
                },
                investigations: {
                    keyArgs: ['filter', 'status'],
                    merge(existing = { edges: [] }, incoming) {
                        return {
                            ...incoming,
                            edges: [...existing.edges, ...incoming.edges],
                        };
                    },
                },
                alerts: {
                    keyArgs: ['filter', 'priority'],
                    merge(existing = { edges: [] }, incoming) {
                        return {
                            ...incoming,
                            edges: [...existing.edges, ...incoming.edges],
                        };
                    },
                },
            },
        },
        Entity: {
            keyFields: ['id'],
            fields: {
                relationships: {
                    merge: false,
                },
            },
        },
        Investigation: {
            keyFields: ['id'],
        },
        OSINTAlert: {
            keyFields: ['id'],
        },
        GEOINTFeature: {
            keyFields: ['id'],
        },
    },
});
// Initialize Apollo Client
const initializeApolloClient = async () => {
    if (apolloClient) {
        return apolloClient;
    }
    const cache = createCache();
    // Persist cache to AsyncStorage
    await (0, apollo3_cache_persist_1.persistCache)({
        cache,
        storage: new apollo3_cache_persist_1.AsyncStorageWrapper(async_storage_1.default),
        maxSize: 1048576 * 10, // 10MB
        debug: __DEV__,
    });
    const wsLink = createWsLink();
    // Split link for HTTP and WebSocket
    const splitLink = (0, client_1.split)(({ query }) => {
        const definition = (0, utilities_1.getMainDefinition)(query);
        return (definition.kind === 'OperationDefinition' &&
            definition.operation === 'subscription');
    }, wsLink, (0, client_1.from)([retryLink, authLink, errorLink, httpLink]));
    apolloClient = new client_1.ApolloClient({
        link: splitLink,
        cache,
        defaultOptions: {
            watchQuery: {
                fetchPolicy: 'cache-and-network',
                errorPolicy: 'all',
                notifyOnNetworkStatusChange: true,
            },
            query: {
                fetchPolicy: 'cache-first',
                errorPolicy: 'all',
            },
            mutate: {
                errorPolicy: 'all',
            },
        },
        connectToDevTools: __DEV__,
    });
    return apolloClient;
};
exports.initializeApolloClient = initializeApolloClient;
// Get the Apollo Client instance
const getApolloClient = () => {
    if (!apolloClient) {
        throw new Error('Apollo Client not initialized. Call initializeApolloClient first.');
    }
    return apolloClient;
};
exports.getApolloClient = getApolloClient;
// Reset Apollo Client (for logout)
const resetApolloClient = async () => {
    if (apolloClient) {
        await apolloClient.clearStore();
        await async_storage_1.default.removeItem('apollo-cache-persist');
    }
};
exports.resetApolloClient = resetApolloClient;
// Persist current cache state
const persistApolloCache = async () => {
    if (apolloClient) {
        const cacheData = apolloClient.cache.extract();
        await async_storage_1.default.setItem('apollo-cache-persist', JSON.stringify(cacheData));
    }
};
exports.persistApolloCache = persistApolloCache;
