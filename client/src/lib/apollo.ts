import { ApolloClient, InMemoryCache, HttpLink, split } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';
import { getGraphqlHttpUrl, getGraphqlWsUrl } from '../config/urls';

const httpLink = new HttpLink({
  uri: getGraphqlHttpUrl(),
});

const wsUrl = getGraphqlWsUrl();
const wsLink = wsUrl.startsWith('ws')
  ? new GraphQLWsLink(
      createClient({
        url: wsUrl,
      }),
    )
  : null;

const splitLink = wsLink
  ? split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return (
          definition.kind === 'OperationDefinition' &&
          definition.operation === 'subscription'
        );
      },
      wsLink,
      httpLink,
    )
  : httpLink;

const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});

export default client;
