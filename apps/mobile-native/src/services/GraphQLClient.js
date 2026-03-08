"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.restoreCache = exports.persistCache = exports.apolloClient = void 0;
const client_1 = require("@apollo/client");
const utilities_1 = require("@apollo/client/utilities");
const subscriptions_1 = require("@apollo/client/link/subscriptions");
// @ts-ignore
const graphql_ws_1 = require("graphql-ws");
const context_1 = require("@apollo/client/link/context");
const error_1 = require("@apollo/client/link/error");
const retry_1 = require("@apollo/client/link/retry");
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const config_1 = require("../config");
const AuthService_1 = require("./AuthService");
// HTTP Link
const httpLink = new client_1.HttpLink({
    uri: config_1.GRAPHQL_URL,
});
// WebSocket Link for subscriptions
const wsLink = new subscriptions_1.GraphQLWsLink((0, graphql_ws_1.createClient)({
    url: config_1.WS_URL,
    connectionParams: async () => {
        const token = await (0, AuthService_1.getAuthToken)();
        return {
            authorization: token ? `Bearer ${token}` : '',
        };
    },
    retryAttempts: 5,
    shouldRetry: () => true,
}));
// Auth Link - Add auth token to requests
const authLink = (0, context_1.setContext)(async (_, { headers }) => {
    const token = await (0, AuthService_1.getAuthToken)();
    return {
        headers: {
            ...headers,
            authorization: token ? `Bearer ${token}` : '',
        },
    };
});
// Error Link - Handle errors globally
const errorLink = (0, error_1.onError)((error) => {
    const { graphQLErrors, networkError, operation, forward } = error;
    if (graphQLErrors) {
        graphQLErrors.forEach(({ message, locations, path }) => {
            console.error(`[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`);
            // Handle authentication errors
            if (message.includes('Unauthorized') || message.includes('Not authenticated')) {
                // Redirect to login or refresh token
                async_storage_1.default.removeItem('auth_token');
            }
        });
    }
    if (networkError) {
        console.error(`[Network error]: ${networkError}`);
    }
    return forward(operation);
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
        retryIf: (error, _operation) => !!error && !error.message.includes('Unauthorized'),
    },
});
// Split link for HTTP and WebSocket
const splitLink = (0, client_1.split)(({ query }) => {
    const definition = (0, utilities_1.getMainDefinition)(query);
    return (definition.kind === 'OperationDefinition' &&
        definition.operation === 'subscription');
}, wsLink, (0, client_1.from)([retryLink, authLink, errorLink, httpLink]));
// Apollo Client
exports.apolloClient = new client_1.ApolloClient({
    link: splitLink,
    cache: new client_1.InMemoryCache({
        typePolicies: {
            Query: {
                fields: {
                    entities: {
                        keyArgs: ['filter', 'search'],
                        merge(existing = [], incoming) {
                            return [...existing, ...incoming];
                        },
                    },
                    cases: {
                        keyArgs: ['filter'],
                        merge(existing = [], incoming) {
                            return [...existing, ...incoming];
                        },
                    },
                },
            },
        },
    }),
    defaultOptions: {
        watchQuery: {
            fetchPolicy: 'cache-and-network',
            errorPolicy: 'all',
        },
        query: {
            fetchPolicy: 'cache-first',
            errorPolicy: 'all',
        },
        mutate: {
            errorPolicy: 'all',
        },
    },
});
// Persist cache to AsyncStorage
const CACHE_KEY = 'apollo-cache-persist';
const persistCache = async () => {
    try {
        const data = exports.apolloClient.cache.extract();
        await async_storage_1.default.setItem(CACHE_KEY, JSON.stringify(data));
    }
    catch (error) {
        console.error('Failed to persist cache:', error);
    }
};
exports.persistCache = persistCache;
const restoreCache = async () => {
    try {
        const data = await async_storage_1.default.getItem(CACHE_KEY);
        if (data) {
            exports.apolloClient.cache.restore(JSON.parse(data));
        }
    }
    catch (error) {
        console.error('Failed to restore cache:', error);
    }
};
exports.restoreCache = restoreCache;
