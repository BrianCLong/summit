"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCache = exports.apolloClient = void 0;
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
const client_1 = require("@apollo/client");
const subscriptions_1 = require("@apollo/client/link/subscriptions");
const utilities_1 = require("@apollo/client/utilities");
const graphql_ws_1 = require("graphql-ws");
const context_1 = require("@apollo/client/link/context");
const persisted_queries_1 = require("@apollo/client/link/persisted-queries");
const crypto_hash_1 = require("crypto-hash");
// Persisted Query Link
const persistedQueryLink = (0, persisted_queries_1.createPersistedQueryLink)({
    sha256: crypto_hash_1.sha256,
    useGETForHashedQueries: true,
});
// HTTP Link for queries and mutations
const httpLink = new client_1.HttpLink({
    uri: 'http://localhost:4001/graphql',
});
// WebSocket Link for subscriptions
const wsLink = new subscriptions_1.GraphQLWsLink((0, graphql_ws_1.createClient)({
    url: 'ws://localhost:4001/graphql',
    connectionParams: () => {
        const token = localStorage.getItem('auth_token');
        return {
            authorization: token ? `Bearer ${token}` : '',
        };
    },
}));
// Auth link to add JWT token to requests
const authLink = (0, context_1.setContext)((_, { headers }) => {
    const token = localStorage.getItem('auth_token');
    return {
        headers: {
            ...headers,
            authorization: token ? `Bearer ${token}` : '',
        },
    };
});
// Split link to use HTTP for queries/mutations and WebSocket for subscriptions
const splitLink = (0, client_1.split)(({ query }) => {
    const definition = (0, utilities_1.getMainDefinition)(query);
    return (definition.kind === 'OperationDefinition' &&
        definition.operation === 'subscription');
}, wsLink, (0, client_1.from)([persistedQueryLink, authLink, httpLink]));
// Apollo Client instance
exports.apolloClient = new client_1.ApolloClient({
    link: splitLink,
    cache: new client_1.InMemoryCache({
        typePolicies: {
            Entity: {
                fields: {
                    relationships: {
                        merge(existing = [], incoming) {
                            return [...existing, ...incoming];
                        },
                    },
                },
            },
            Investigation: {
                fields: {
                    entities: {
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
            errorPolicy: 'all',
            notifyOnNetworkStatusChange: true,
        },
        query: {
            errorPolicy: 'all',
        },
    },
});
// Helper function to update cache after mutations
const updateCache = (cache, query, data) => {
    try {
        const existingData = cache.readQuery(query);
        if (existingData) {
            cache.writeQuery({
                ...query,
                data: {
                    ...existingData,
                    ...data,
                },
            });
        }
    }
    catch (error) {
        // Query not in cache yet, ignore
    }
};
exports.updateCache = updateCache;
