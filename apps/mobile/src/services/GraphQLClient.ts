import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  split,
  from,
  type NormalizedCacheObject,
} from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import { persistCache, AsyncStorageWrapper } from 'apollo3-cache-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

import { API_CONFIG, CACHE_CONFIG } from '@/config';
import { getAuthToken, refreshAuthToken, clearAuthToken } from './AuthService';
import { queueOfflineMutation } from './OfflineQueueService';

let apolloClient: ApolloClient<NormalizedCacheObject> | null = null;

// HTTP Link for queries and mutations
const httpLink = new HttpLink({
  uri: API_CONFIG.graphqlUrl,
  credentials: 'include',
});

// WebSocket Link for subscriptions
const createWsLink = () =>
  new GraphQLWsLink(
    createClient({
      url: API_CONFIG.wsUrl,
      connectionParams: async () => {
        const token = await getAuthToken();
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
    }),
  );

// Auth Link - Add auth token to requests
const authLink = setContext(async (_, { headers }) => {
  const token = await getAuthToken();
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
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    for (const error of graphQLErrors) {
      console.error(
        `[GraphQL error]: Message: ${error.message}, Path: ${error.path}`,
      );

      // Handle authentication errors
      if (
        error.extensions?.code === 'UNAUTHENTICATED' ||
        error.message.includes('Unauthorized') ||
        error.message.includes('Not authenticated')
      ) {
        // Try to refresh token
        refreshAuthToken()
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
            } else {
              clearAuthToken();
            }
          })
          .catch(() => {
            clearAuthToken();
          });
      }
    }
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`);

    // Check if offline and queue mutation
    NetInfo.fetch().then((state) => {
      if (!state.isConnected) {
        const definition = getMainDefinition(operation.query);
        if (
          definition.kind === 'OperationDefinition' &&
          definition.operation === 'mutation'
        ) {
          queueOfflineMutation(operation);
        }
      }
    });
  }
});

// Retry Link - Retry failed requests
const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: 5000,
    jitter: true,
  },
  attempts: {
    max: 3,
    retryIf: (error, _operation) => {
      // Don't retry auth errors
      if (error?.message?.includes('Unauthorized')) return false;
      return !!error;
    },
  },
});

// Create cache with type policies
const createCache = () =>
  new InMemoryCache({
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
export const initializeApolloClient = async (): Promise<
  ApolloClient<NormalizedCacheObject>
> => {
  if (apolloClient) {
    return apolloClient;
  }

  const cache = createCache();

  // Persist cache to AsyncStorage
  await persistCache({
    cache,
    storage: new AsyncStorageWrapper(AsyncStorage),
    maxSize: 1048576 * 10, // 10MB
    debug: __DEV__,
  });

  const wsLink = createWsLink();

  // Split link for HTTP and WebSocket
  const splitLink = split(
    ({ query }) => {
      const definition = getMainDefinition(query);
      return (
        definition.kind === 'OperationDefinition' &&
        definition.operation === 'subscription'
      );
    },
    wsLink,
    from([retryLink, authLink, errorLink, httpLink]),
  );

  apolloClient = new ApolloClient({
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

// Get the Apollo Client instance
export const getApolloClient = (): ApolloClient<NormalizedCacheObject> => {
  if (!apolloClient) {
    throw new Error('Apollo Client not initialized. Call initializeApolloClient first.');
  }
  return apolloClient;
};

// Reset Apollo Client (for logout)
export const resetApolloClient = async (): Promise<void> => {
  if (apolloClient) {
    await apolloClient.clearStore();
    await AsyncStorage.removeItem('apollo-cache-persist');
  }
};

// Persist current cache state
export const persistApolloCache = async (): Promise<void> => {
  if (apolloClient) {
    const cacheData = apolloClient.cache.extract();
    await AsyncStorage.setItem('apollo-cache-persist', JSON.stringify(cacheData));
  }
};
