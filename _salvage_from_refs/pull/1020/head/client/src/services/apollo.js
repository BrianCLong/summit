import { ApolloClient, InMemoryCache, createHttpLink, split } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { getMainDefinition } from '@apollo/client/utilities';
import { setContext } from '@apollo/client/link/context';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';

const httpLink = createHttpLink({
  uri: import.meta.env.VITE_API_URL || 'http://localhost:4000/graphql',
});

const errorLink = onError(({ graphQLErrors }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message }) => {
      if (message.includes('Access denied') && typeof window !== 'undefined') {
        alert(`Access denied: ${message}`);
      }
    });
  }
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  }
});

// Set up WebSocket link for subscriptions
let link = errorLink.concat(authLink.concat(httpLink));

try {
  const wsUrl = (import.meta.env.VITE_API_URL || 'http://localhost:4000/graphql')
    .replace('http://', 'ws://')
    .replace('https://', 'wss://');

  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : '';
  const wsLink = new GraphQLWsLink(createClient({
    url: wsUrl,
    connectionParams: {
      authorization: token ? `Bearer ${token}` : '',
    },
    retryAttempts: 5,
  }));

  link = errorLink.concat(split(
    ({ query }) => {
      const def = getMainDefinition(query);
      return def.kind === 'OperationDefinition' && def.operation === 'subscription';
    },
    wsLink,
    authLink.concat(httpLink)
  ));
} catch (e) {
  // graphql-ws not installed or failed to initialize; subscriptions disabled
  console.warn('WebSocket subscriptions disabled:', e.message);
}

export const apolloClient = new ApolloClient({
  link,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
    },
    query: {
      errorPolicy: 'all',
    },
  },
});