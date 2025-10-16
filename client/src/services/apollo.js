import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  split,
} from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import { setContext } from '@apollo/client/link/context';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';

const httpLink = createHttpLink({
  uri: import.meta.env.VITE_API_URL || 'http://localhost:4000/graphql',
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('token');

  // Generate a W3C traceparent header for end-to-end tracing
  const traceId = crypto.randomUUID().replace(/-/g, '');
  const spanIdArray = new Uint8Array(8);
  crypto.getRandomValues(spanIdArray);
  const spanId = Array.from(spanIdArray, (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
  const traceparent = `00-${traceId}-${spanId}-01`;

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
      traceparent,
    },
  };
});

// Set up WebSocket link for subscriptions
let link = authLink.concat(httpLink);

try {
  const wsUrl = (
    import.meta.env.VITE_API_URL || 'http://localhost:4000/graphql'
  )
    .replace('http://', 'ws://')
    .replace('https://', 'wss://');

  const token =
    typeof localStorage !== 'undefined' ? localStorage.getItem('token') : '';
  const wsLink = new GraphQLWsLink(
    createClient({
      url: wsUrl,
      connectionParams: {
        authorization: token ? `Bearer ${token}` : '',
      },
      retryAttempts: 5,
    }),
  );

  link = split(
    ({ query }) => {
      const def = getMainDefinition(query);
      return (
        def.kind === 'OperationDefinition' && def.operation === 'subscription'
      );
    },
    wsLink,
    authLink.concat(httpLink),
  );
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
