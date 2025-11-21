/**
 * Apollo Federation Gateway
 * Provides a unified GraphQL API from multiple subgraphs
 */

import { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { readFileSync } from 'fs';
import { AuthContext } from '../directives/auth';

export interface SubgraphConfig {
  name: string;
  url: string;
  headers?: Record<string, string>;
}

export interface GatewayConfig {
  subgraphs: SubgraphConfig[];
  debug?: boolean;
  introspectionHeaders?: Record<string, string>;
  pollIntervalMs?: number;
}

/**
 * Custom data source that forwards auth headers to subgraphs
 */
class AuthenticatedDataSource extends RemoteGraphQLDataSource {
  willSendRequest({ request, context }: any) {
    // Forward authentication token to subgraphs
    if (context.token) {
      request.http.headers.set('authorization', `Bearer ${context.token}`);
    }

    // Forward tenant ID for multi-tenancy
    if (context.user?.tenantId) {
      request.http.headers.set('x-tenant-id', context.user.tenantId);
    }

    // Forward request ID for tracing
    if (context.requestId) {
      request.http.headers.set('x-request-id', context.requestId);
    }
  }
}

/**
 * Create and configure Apollo Gateway
 */
export async function createFederatedGateway(
  config: GatewayConfig
): Promise<ApolloGateway> {
  const gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({
      subgraphs: config.subgraphs.map((subgraph) => ({
        name: subgraph.name,
        url: subgraph.url,
      })),
      introspectionHeaders: config.introspectionHeaders || {},
      pollIntervalInMs: config.pollIntervalMs,
    }),
    buildService({ url }) {
      return new AuthenticatedDataSource({ url });
    },
    debug: config.debug || false,
  });

  return gateway;
}

/**
 * Create Apollo Server with Federation Gateway
 */
export async function createFederatedServer(config: GatewayConfig) {
  const gateway = await createFederatedGateway(config);

  const server = new ApolloServer({
    gateway,
    // Disable subscriptions for now (use dedicated subscription server)
    // subscriptions: false,
  });

  await server.start();

  return { server, gateway };
}

/**
 * Default subgraph configuration
 * These should be loaded from environment variables in production
 */
export const defaultSubgraphs: SubgraphConfig[] = [
  {
    name: 'core',
    url: process.env.CORE_SUBGRAPH_URL || 'http://localhost:4001/graphql',
  },
  {
    name: 'entities',
    url: process.env.ENTITIES_SUBGRAPH_URL || 'http://localhost:4002/graphql',
  },
  {
    name: 'relationships',
    url: process.env.RELATIONSHIPS_SUBGRAPH_URL || 'http://localhost:4003/graphql',
  },
  {
    name: 'ai-analysis',
    url: process.env.AI_SUBGRAPH_URL || 'http://localhost:4004/graphql',
  },
  {
    name: 'investigations',
    url: process.env.INVESTIGATIONS_SUBGRAPH_URL || 'http://localhost:4005/graphql',
  },
];

/**
 * Context builder for federated gateway
 */
export function buildFederatedContext(req: any, res: any): AuthContext & { requestId: string; token?: string } {
  // Extract token from Authorization header
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : undefined;

  // Generate request ID for tracing
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    user: (req as any).user, // Populated by auth middleware
    token,
    requestId,
  };
}

/**
 * Health check endpoint for gateway
 */
export async function gatewayHealthCheck(gateway: ApolloGateway): Promise<{
  healthy: boolean;
  subgraphs: Array<{ name: string; healthy: boolean; error?: string }>;
}> {
  const serviceList = gateway.serviceList || [];
  const results = [];

  for (const service of serviceList) {
    try {
      // Attempt a simple introspection query
      const response = await fetch(service.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ __typename }' }),
      });

      results.push({
        name: service.name,
        healthy: response.ok,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      });
    } catch (error) {
      results.push({
        name: service.name,
        healthy: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    healthy: results.every((r) => r.healthy),
    subgraphs: results,
  };
}
