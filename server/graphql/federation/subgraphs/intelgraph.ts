import gql from 'graphql-tag';
import type { GraphQLSchema } from 'graphql';
import { buildSubgraphSchema } from '@apollo/subgraph';

import { JSONScalar } from '../scalars.js';

export interface IntelgraphEntity {
  id: string;
  name: string;
  type: string;
  attributes: Record<string, unknown> | null;
}

const entities: IntelgraphEntity[] = [
  {
    id: 'entity-1',
    name: 'Aurora Node',
    type: 'PERSON_OF_INTEREST',
    attributes: { riskScore: 0.42, region: 'NA' },
  },
  {
    id: 'entity-2',
    name: 'Helios Network',
    type: 'ORGANIZATION',
    attributes: { riskScore: 0.77, region: 'EU' },
  },
];

export const intelgraphTypeDefs = gql`
  scalar JSON

  type Entity @key(fields: "id") {
    id: ID!
    name: String!
    type: String!
    attributes: JSON
  }

  type Query {
    entity(id: ID!): Entity
    entities: [Entity!]!
  }
`;

export const intelgraphResolvers = {
  JSON: JSONScalar,
  Query: {
    entity: (_: unknown, { id }: { id: string }) => entities.find((entity) => entity.id === id) ?? null,
    entities: () => entities,
  },
  Entity: {
    __resolveReference(reference: { id: string }) {
      return entities.find((entity) => entity.id === reference.id) ?? null;
    },
  },
};

export function buildIntelgraphSubgraphSchema(): GraphQLSchema {
  return buildSubgraphSchema({
    typeDefs: intelgraphTypeDefs,
    resolvers: intelgraphResolvers,
  });
}

export function getIntelgraphEntities(): readonly IntelgraphEntity[] {
  return entities;
}
