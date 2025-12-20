import React, { useEffect, useState } from 'react';
import { ApolloClient, ApolloProvider, NormalizedCacheObject } from '@apollo/client';
import { createApolloClient } from './createApolloClient';

/**
 * A higher-order component (HOC) or wrapper that provides the Apollo Client context to its children.
 * This ensures that all components within the tree can access GraphQL data via Apollo hooks.
 * It initializes the Apollo Client asynchronously.
 *
 * @param props - The component props.
 * @param props.children - The child components to wrap with the Apollo Provider.
 * @returns The ApolloProvider component wrapping the children, or null while initializing.
 */
export function WithApollo({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<ApolloClient<NormalizedCacheObject> | null>(null);

  useEffect(() => {
    createApolloClient().then(setClient);
  }, []);

  if (!client) {
    return null; // or a loading spinner
  }

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
