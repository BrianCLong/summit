import {
  ApolloClient,
  ApolloLink,
  ApolloProvider,
  HttpLink,
  InMemoryCache,
  split,
} from '@apollo/client';
import { MockedResponse } from '@apollo/client/testing';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { ReactNode, useMemo } from 'react';
import { createClient } from 'graphql-ws';
import { createWorkflowSubscriptionMock, sequenceEvents } from './mocks';

const createApolloClient = (httpUrl: string, wsUrl: string) => {
  const httpLink = new HttpLink({ uri: httpUrl });
  const wsLink = new GraphQLWsLink(
    createClient({
      url: wsUrl,
    }),
  );

  const splitLink = split(
    ({ query }) => {
      const definition = getMainDefinition(query);
      return (
        definition.kind === 'OperationDefinition' &&
        definition.operation === 'subscription'
      );
    },
    wsLink,
    httpLink,
  );

  return new ApolloClient({
    link: splitLink,
    cache: new InMemoryCache({ addTypename: false }),
  });
};

export interface WorkflowApolloProviderProps {
  children: ReactNode;
  mocks?: MockedResponse[];
}

export function WorkflowApolloProvider({
  children,
  mocks,
}: WorkflowApolloProviderProps) {
  const resolveRuntimeEnv = (key: string): string | undefined => {
    const globalValue = (globalThis as Record<string, unknown>)[key];
    if (typeof globalValue === 'string') {
      return globalValue;
    }
    const metaEnv = (globalThis as {
      __VITE_IMPORT_META_ENV__?: Record<string, string>;
    }).__VITE_IMPORT_META_ENV__;
    if (metaEnv && typeof metaEnv[key] === 'string') {
      return metaEnv[key] as string;
    }
    const processValue =
      typeof process !== 'undefined' ? process.env?.[key] : undefined;
    if (typeof processValue === 'string') {
      return processValue;
    }
    return undefined;
  };

  const httpUrl = resolveRuntimeEnv('VITE_WORKFLOW_GRAPHQL_HTTP');
  const wsUrl = resolveRuntimeEnv('VITE_WORKFLOW_GRAPHQL_WS');

  const client = useMemo(() => {
    if (httpUrl && wsUrl) {
      return createApolloClient(httpUrl, wsUrl);
    }
    return undefined;
  }, [httpUrl, wsUrl]);

  if (client) {
    return <ApolloProvider client={client}>{children}</ApolloProvider>;
  }

  const mockClient = useMemo(() => {
    const mockResponses = mocks ?? createWorkflowSubscriptionMock();
    const link = new ApolloLink(() => {
      const factory = mockResponses[0]?.result;
      if (typeof factory === 'function') {
        return (factory as any)({});
      }
      return sequenceEvents();
    });
    return new ApolloClient({
      link,
      cache: new InMemoryCache(),
    });
  }, [mocks]);

  return <ApolloProvider client={mockClient}>{children}</ApolloProvider>;
}
