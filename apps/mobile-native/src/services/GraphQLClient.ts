import {ApolloClient, InMemoryCache, HttpLink, split, from} from '@apollo/client';
import {getMainDefinition} from '@apollo/client/utilities';
import {GraphQLWsLink} from '@apollo/client/link/subscriptions';
import {createClient} from 'graphql-ws';
import {setContext} from '@apollo/client/link/context';
import {onError} from '@apollo/client/link/error';
import {RetryLink} from '@apollo/client/link/retry';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {API_URL, GRAPHQL_URL, WS_URL} from '../config';
import {getAuthToken} from './AuthService';

// HTTP Link
const httpLink = new HttpLink({
  uri: GRAPHQL_URL,
});

// WebSocket Link for subscriptions
const wsLink = new GraphQLWsLink(
  createClient({
    url: WS_URL,
    connectionParams: async () => {
      const token = await getAuthToken();
      return {
        authorization: token ? `Bearer ${token}` : '',
      };
    },
    retryAttempts: 5,
    shouldRetry: () => true,
  }),
);

// Auth Link - Add auth token to requests
const authLink = setContext(async (_, {headers}) => {
  const token = await getAuthToken();
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

// Error Link - Handle errors globally
const errorLink = onError(({graphQLErrors, networkError, operation, forward}) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({message, locations, path}) => {
      console.error(`[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`);

      // Handle authentication errors
      if (message.includes('Unauthorized') || message.includes('Not authenticated')) {
        // Redirect to login or refresh token
        AsyncStorage.removeItem('auth_token');
      }
    });
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
  }

  return forward(operation);
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
    retryIf: (error, _operation) => !!error && !error.message.includes('Unauthorized'),
  },
});

// Split link for HTTP and WebSocket
const splitLink = split(
  ({query}) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  from([retryLink, authLink, errorLink, httpLink]),
);

// Apollo Client
export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache({
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

export const persistCache = async () => {
  try {
    const data = apolloClient.cache.extract();
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to persist cache:', error);
  }
};

export const restoreCache = async () => {
  try {
    const data = await AsyncStorage.getItem(CACHE_KEY);
    if (data) {
      apolloClient.cache.restore(JSON.parse(data));
    }
  } catch (error) {
    console.error('Failed to restore cache:', error);
  }
};
