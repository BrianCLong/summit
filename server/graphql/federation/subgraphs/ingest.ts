import gql from 'graphql-tag';
import type { GraphQLSchema } from 'graphql';
import { buildSubgraphSchema } from '@apollo/subgraph';

export interface IngestEvent {
  id: string;
  entityId: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETE' | 'FAILED';
  source: string;
  receivedAt: string;
}

const ingestEvents: IngestEvent[] = [
  {
    id: 'ingest-1',
    entityId: 'entity-1',
    status: 'COMPLETE',
    source: 'SIGINT',
    receivedAt: '2024-09-30T21:00:00.000Z',
  },
  {
    id: 'ingest-2',
    entityId: 'entity-1',
    status: 'PROCESSING',
    source: 'OSINT',
    receivedAt: '2024-10-01T08:00:00.000Z',
  },
  {
    id: 'ingest-3',
    entityId: 'entity-2',
    status: 'QUEUED',
    source: 'HUMINT',
    receivedAt: '2024-10-02T12:15:00.000Z',
  },
];

export const ingestTypeDefs = gql`
  type IngestEvent @key(fields: "id") {
    id: ID!
    entityId: ID!
    status: String!
    source: String!
    receivedAt: String!
  }

  extend type Entity @key(fields: "id") {
    id: ID! @external
    ingestEvents(status: String): [IngestEvent!]!
    latestIngestEvent: IngestEvent
  }

  type Query {
    ingestEvent(id: ID!): IngestEvent
  }
`;

export const ingestResolvers = {
  Query: {
    ingestEvent: (_: unknown, { id }: { id: string }) =>
      ingestEvents.find((event) => event.id === id) ?? null,
  },
  IngestEvent: {
    __resolveReference(reference: { id: string }) {
      return ingestEvents.find((event) => event.id === reference.id) ?? null;
    },
  },
  Entity: {
    __resolveReference(reference: { id: string }) {
      return { id: reference.id };
    },
    ingestEvents(entity: { id: string }, args: { status?: string }) {
      const filtered = ingestEvents.filter((event) => event.entityId === entity.id);
      if (!args.status) {
        return filtered;
      }
      return filtered.filter((event) => event.status === args.status);
    },
    latestIngestEvent(entity: { id: string }) {
      const sorted = ingestEvents
        .filter((event) => event.entityId === entity.id)
        .slice()
        .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
      return sorted[0] ?? null;
    },
  },
};

export function buildIngestSubgraphSchema(): GraphQLSchema {
  return buildSubgraphSchema({
    typeDefs: ingestTypeDefs,
    resolvers: ingestResolvers,
  });
}

export function getIngestEvents(): readonly IngestEvent[] {
  return ingestEvents;
}
