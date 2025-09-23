import { ApolloClient, InMemoryCache, createHttpLink, split } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import { setContext } from '@apollo/client/link/context';

const httpLink = createHttpLink({
  uri: import.meta.env.VITE_API_URL || 'http://localhost:4000/graphql',
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

// Optional subscriptions support via graphql-ws (if installed)
let link = authLink.concat(httpLink);

try {
  // Dynamically require to avoid build error when dependency is missing
  const { GraphQLWsLink } = await import('@apollo/client/link/subscriptions');
  const { createClient } = await import('graphql-ws');
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

  link = split(
    ({ query }) => {
      const def = getMainDefinition(query);
      return def.kind === 'OperationDefinition' && def.operation === 'subscription';
    },
    wsLink,
    authLink.concat(httpLink)
  );
} catch (e) {
  // graphql-ws not installed; subscriptions disabled
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
