import { ApolloClient, InMemoryCache, from, split } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { BatchHttpLink } from '@apollo/client/link/batch-http';
import { RetryLink } from '@apollo/client/link/retry';
import { createClient as createWsClient } from 'graphql-ws';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createPersistedQueryLink } from '@apollo/client/link/persisted-queries';
import { setContext } from '@apollo/client/link/context';
import { persistCache, LocalStorageWrapper } from 'apollo3-cache-persist';
import sha256 from 'crypto-js/sha256';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001/graphql';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4001/graphql';
const TENANT = import.meta.env.VITE_TENANT_ID || 'dev';

import { Observable } from '@apollo/client';

let isRefreshing = false;
let pendingRequests: ((token: string) => void)[] = [];

const refreshToken = async () => {
  try {
    const response = await fetch('/auth/refresh_token', {
      method: 'POST',
      credentials: 'include',
    });
    const { accessToken } = await response.json();
    localStorage.setItem('token', accessToken);
    return accessToken;
  } catch (error) {
    localStorage.removeItem('token');
    // Handle refresh failure (e.g., redirect to login)
    return null;
  }
};

export async function createApolloClient() {
  const errorLink = onError(
    ({ graphQLErrors, networkError, operation, forward }) => {
      if (graphQLErrors) {
        for (const err of graphQLErrors) {
          if (err.extensions.code === 'UNAUTHENTICATED') {
            if (!isRefreshing) {
              isRefreshing = true;
              refreshToken().then((token) => {
                isRefreshing = false;
                if (token) {
                  pendingRequests.forEach((resolve) => resolve(token));
                  pendingRequests = [];
                }
              });
            }
            return new Observable((observer) => {
              pendingRequests.push(() => {
                const oldHeaders = operation.getContext().headers;
                operation.setContext({
                  headers: {
                    ...oldHeaders,
                    authorization: `Bearer ${localStorage.getItem('token')}`,
                  },
                });
                const subscriber = {
                  next: observer.next.bind(observer),
                  error: observer.error.bind(observer),
                  complete: observer.complete.bind(observer),
                };
                forward(operation).subscribe(subscriber);
              });
            });
          }
        }
      }

      if (networkError) {
        // eslint-disable-next-line no-console
        console.error('[NET]', networkError);
      }
    },
  );
  // Retry policy for network errors on idempotent operations
  const retryLink = new RetryLink({
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
  const authLink = setContext((_, { headers }) => {
    const token =
      typeof localStorage !== 'undefined' ? localStorage.getItem('token') : '';

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
        'x-tenant-id': TENANT,
        traceparent,
      },
    };
  });

  // Persisted queries per APQ; use GET for hashed ops
  const persisted = createPersistedQueryLink({
    sha256: (s) => sha256(s).toString(),
    useGETForHashedQueries: true,
  });

  const http = new BatchHttpLink({
    uri: API_URL,
    batchMax: 10,
    batchInterval: 20,
    fetchOptions: { mode: 'cors', credentials: 'include' },
  });

  let link = from([errorLink, retryLink, authLink, persisted, http]);

  // Subscriptions (if enabled on server)
  try {
    const wsUrl = API_URL.replace('http://', 'ws://').replace(
      'https://',
      'wss://',
    );

    const token =
      typeof localStorage !== 'undefined' ? localStorage.getItem('token') : '';

    const ws = new GraphQLWsLink(
      createWsClient({
        url: wsUrl,
        connectionParams: {
          authorization: token ? `Bearer ${token}` : '',
          'x-tenant-id': TENANT,
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
      ws,
      from([errorLink, retryLink, authLink, persisted, http]),
    );
  } catch (e) {
    // WebSocket subscriptions optional
    console.warn('WebSocket subscriptions disabled:', (e as Error).message);
  }

  const cache = new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          entities: {
            keyArgs: ['filter', 'sort', 'tenant'],
            merge(existing = { items: [] }, incoming) {
              if (!incoming?.items) return existing;
              return {
                ...incoming,
                items: [...(existing.items || []), ...incoming.items],
              };
            },
          },
          investigations: {
            keyArgs: ['after', 'status', 'tenant'],
            merge(existing, incoming) {
              if (!incoming) return existing;
              if (!existing) return incoming;

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
      await persistCache({
        cache,
        storage: new LocalStorageWrapper(window.localStorage),
        key: `apollo-cache-${TENANT}`,
        trigger: 'write',
        debounce: 1000,
        maxSize: 1024 * 1024 * 10, // 10MB limit
      });

      // Clear cache if it gets corrupted
      if (import.meta.env.DEV) {
        console.log('Apollo cache persistence enabled for tenant:', TENANT);
      }
    } catch (error) {
      console.warn('Apollo cache persistence failed:', error);
      // Clear potentially corrupted cache
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(`apollo-cache-${TENANT}`);
      }
    }
  }

  return new ApolloClient({
    link,
    cache,
    connectToDevTools: import.meta.env.DEV,
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
