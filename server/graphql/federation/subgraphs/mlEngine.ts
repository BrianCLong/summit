import gql from 'graphql-tag';
import type { GraphQLSchema } from 'graphql';
import { buildSubgraphSchema } from '@apollo/subgraph';

import { JSONScalar } from '../scalars.js';

export interface MlJob {
  id: string;
  entityId: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  result: Record<string, unknown> | null;
  createdAt: string;
}

const mlJobs: MlJob[] = [
  {
    id: 'ml-1',
    entityId: 'entity-1',
    status: 'COMPLETED',
    result: { type: 'anomaly-detection', score: 0.91 },
    createdAt: '2024-10-01T00:00:00.000Z',
  },
  {
    id: 'ml-2',
    entityId: 'entity-1',
    status: 'QUEUED',
    result: null,
    createdAt: '2024-10-01T04:00:00.000Z',
  },
  {
    id: 'ml-3',
    entityId: 'entity-2',
    status: 'RUNNING',
    result: null,
    createdAt: '2024-10-02T12:30:00.000Z',
  },
];

export const mlEngineTypeDefs = gql`
  scalar JSON

  type MlJob @key(fields: "id") {
    id: ID!
    entityId: ID!
    status: String!
    createdAt: String!
    result: JSON
  }

  extend type Entity @key(fields: "id") {
    id: ID! @external
    mlJobs: [MlJob!]!
    latestMlJob: MlJob
  }

  type Query {
    mlJob(id: ID!): MlJob
    mlJobsForEntity(entityId: ID!): [MlJob!]!
  }
`;

export const mlEngineResolvers = {
  JSON: JSONScalar,
  Query: {
    mlJob: (_: unknown, { id }: { id: string }) => mlJobs.find((job) => job.id === id) ?? null,
    mlJobsForEntity: (_: unknown, { entityId }: { entityId: string }) =>
      mlJobs.filter((job) => job.entityId === entityId),
  },
  MlJob: {
    __resolveReference(reference: { id: string }) {
      return mlJobs.find((job) => job.id === reference.id) ?? null;
    },
  },
  Entity: {
    __resolveReference(reference: { id: string }) {
      return { id: reference.id };
    },
    mlJobs(entity: { id: string }) {
      return mlJobs.filter((job) => job.entityId === entity.id);
    },
    latestMlJob(entity: { id: string }) {
      const sorted = mlJobs
        .filter((job) => job.entityId === entity.id)
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return sorted[0] ?? null;
    },
  },
};

export function buildMlEngineSubgraphSchema(): GraphQLSchema {
  return buildSubgraphSchema({
    typeDefs: mlEngineTypeDefs,
    resolvers: mlEngineResolvers,
  });
}

export function getMlJobs(): readonly MlJob[] {
  return mlJobs;
}
