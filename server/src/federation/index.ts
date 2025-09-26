import type { RemoteSubgraphConfig } from '../../graphql/federation/index.js';
import {
  createFederatedApolloServer,
  createGateway,
  defaultRemoteSubgraphs,
  getRemoteSubgraphsFromEnv,
} from '../../graphql/federation/index.js';

export interface Subgraph {
  name: string;
  url: string;
}

export function registerSubgraph(name: string, url: string): Subgraph {
  return { name, url };
}

export function resolveFederationConfig(): RemoteSubgraphConfig[] {
  return getRemoteSubgraphsFromEnv();
}

export function federationStatus(): string {
  return 'ready';
}

export const federation = {
  createGateway,
  createFederatedApolloServer,
  defaultRemoteSubgraphs,
};
