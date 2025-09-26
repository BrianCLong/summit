import { ApolloServer } from '@apollo/server';
import {
  ApolloGateway,
  IntrospectAndCompose,
  LocalGraphQLDataSource,
} from '@apollo/gateway';
import { composeServices } from '@apollo/composition';
import { printSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import type { GraphQLSchema } from 'graphql';

import { buildIngestSubgraphSchema, getIngestEvents } from './subgraphs/ingest.js';
import { buildIntelgraphSubgraphSchema, getIntelgraphEntities } from './subgraphs/intelgraph.js';
import { buildMlEngineSubgraphSchema, getMlJobs } from './subgraphs/mlEngine.js';

export interface RemoteSubgraphConfig {
  name: string;
  url: string;
}

export interface LocalSubgraph {
  name: string;
  schema: GraphQLSchema;
}

export interface CreateGatewayOptions {
  useLocalServices?: boolean;
  localSubgraphs?: LocalSubgraph[];
  remoteSubgraphs?: RemoteSubgraphConfig[];
}

export interface CreateFederatedServerOptions extends CreateGatewayOptions {
  apollo?: Omit<Parameters<typeof ApolloServer>[0], 'gateway'>;
}

export interface GatewayBuildResult {
  gateway: ApolloGateway;
  localSubgraphs: LocalSubgraph[] | null;
  supergraphSdl: string | null;
}

export const defaultRemoteSubgraphs: RemoteSubgraphConfig[] = [
  { name: 'intelgraph', url: 'http://intelgraph-core:4001/graphql' },
  { name: 'mlEngine', url: 'http://ml-engine:4002/graphql' },
  { name: 'ingest', url: 'http://ingest-service:4003/graphql' },
];

export function getRemoteSubgraphsFromEnv(): RemoteSubgraphConfig[] {
  const raw = process.env.FEDERATION_SUBGRAPHS;
  if (!raw) {
    return defaultRemoteSubgraphs;
  }

  try {
    const parsed = JSON.parse(raw) as RemoteSubgraphConfig[];
    if (!Array.isArray(parsed) || parsed.some((subgraph) => !subgraph?.name || !subgraph?.url)) {
      throw new Error('Invalid subgraph definition');
    }
    return parsed;
  } catch (error) {
    throw new Error(
      `Failed to parse FEDERATION_SUBGRAPHS: ${(error as Error).message}. Expected JSON array of { name, url } objects.`,
    );
  }
}

export function buildDefaultLocalSubgraphs(): LocalSubgraph[] {
  return [
    { name: 'intelgraph', schema: buildIntelgraphSubgraphSchema() },
    { name: 'mlEngine', schema: buildMlEngineSubgraphSchema() },
    { name: 'ingest', schema: buildIngestSubgraphSchema() },
  ];
}

export function composeLocalSupergraph(subgraphs: LocalSubgraph[]): string {
  const composition = composeServices(
    subgraphs.map(({ name, schema }) => ({
      name,
      typeDefs: gql(printSubgraphSchema(schema)),
    })),
  );

  if (composition.errors?.length) {
    const details = composition.errors.map((error) => error.message).join('; ');
    throw new Error(`Failed to compose local subgraphs: ${details}`);
  }

  if (!composition.supergraphSdl) {
    throw new Error('Apollo composition did not return a supergraph SDL.');
  }

  return composition.supergraphSdl;
}

export function createGateway(options: CreateGatewayOptions = {}): GatewayBuildResult {
  const useLocal =
    options.useLocalServices ?? process.env.FEDERATION_USE_LOCAL === 'true' ?? process.env.NODE_ENV === 'test';

  if (useLocal) {
    const subgraphs = options.localSubgraphs ?? buildDefaultLocalSubgraphs();
    const supergraphSdl = composeLocalSupergraph(subgraphs);
    const schemaMap = new Map(subgraphs.map((subgraph) => [subgraph.name, subgraph.schema] as const));

    const gateway = new ApolloGateway({
      supergraphSdl,
      buildService({ name }) {
        const schema = schemaMap.get(name);
        if (!schema) {
          throw new Error(`Unknown local subgraph requested: ${name}`);
        }
        return new LocalGraphQLDataSource(schema);
      },
    });

    return { gateway, localSubgraphs: subgraphs, supergraphSdl };
  }

  const remoteSubgraphs = options.remoteSubgraphs ?? getRemoteSubgraphsFromEnv();

  const gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({
      subgraphs: remoteSubgraphs,
      pollIntervalInMs: Number(process.env.FEDERATION_POLL_INTERVAL_MS ?? 30000),
    }),
  });

  return { gateway, localSubgraphs: null, supergraphSdl: null };
}

export function createFederatedApolloServer(options: CreateFederatedServerOptions = {}) {
  const { gateway, localSubgraphs } = createGateway(options);

  const userPlugins = options.apollo?.plugins ?? [];

  const server = new ApolloServer({
    introspection: options.apollo?.introspection ?? true,
    includeStacktraceInErrorResponses: options.apollo?.includeStacktraceInErrorResponses ?? true,
    ...options.apollo,
    gateway,
    plugins: [
      ...userPlugins,
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await gateway.stop();
            },
          };
        },
      },
    ],
  });

  return { server, gateway, localSubgraphs };
}

export const federationSeedData = {
  entities: getIntelgraphEntities(),
  mlJobs: getMlJobs(),
  ingestEvents: getIngestEvents(),
};
