import { buildFederatedSchema } from '@apollo/federation';
import gql from 'graphql-tag';
import { GraphQLScalarType, Kind } from 'graphql';
import { typeDefs as insightsTypeDefs, resolvers as insightsResolvers } from './insights.js';
import { typeDefs as alertsTypeDefs, resolvers as alertsResolvers } from './alerts.js';
import { typeDefs as entitiesTypeDefs, resolvers as entitiesResolvers } from './entities.js';
import { typeDefs as collaborationTypeDefs, resolvers as collaborationResolvers } from './collaboration.js';

const baseTypeDefs = gql`
  scalar JSON
  scalar DateTime
  type Query { _empty: String }
  type Mutation { _empty: String }
`;

const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'Arbitrary JSON value',
  parseValue: (value) => value,
  serialize: (value) => value,
  parseLiteral(ast): any {
    switch (ast.kind) {
      case Kind.STRING:
      case Kind.BOOLEAN:
        return ast.value;
      case Kind.INT:
      case Kind.FLOAT:
        return Number(ast.value);
      case Kind.OBJECT: {
        const value: any = {};
        ast.fields.forEach((f) => {
          value[f.name.value] = (JSONScalar.parseLiteral as any)(f.value);
        });
        return value;
      }
      case Kind.LIST:
        return ast.values.map((v) => (JSONScalar.parseLiteral as any)(v));
      default:
        return null;
    }
  },
});

const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'ISO date string',
  parseValue: (value) => (value ? new Date(value) : null),
  serialize: (value) => (value instanceof Date ? value.toISOString() : new Date(value).toISOString()),
  parseLiteral: (ast) => (ast.kind === Kind.STRING ? new Date(ast.value) : null),
});

const baseResolvers = {
  JSON: JSONScalar,
  DateTime: DateTimeScalar,
  Query: { _empty: () => 'ok' },
  Mutation: { _empty: () => 'ok' },
};

export const mlSubgraphSchema = buildFederatedSchema([
  { typeDefs: baseTypeDefs, resolvers: baseResolvers },
  { typeDefs: insightsTypeDefs, resolvers: insightsResolvers },
  { typeDefs: alertsTypeDefs, resolvers: alertsResolvers },
]);

export const ingestSubgraphSchema = buildFederatedSchema([
  { typeDefs: baseTypeDefs, resolvers: baseResolvers },
  { typeDefs: entitiesTypeDefs, resolvers: entitiesResolvers },
  { typeDefs: collaborationTypeDefs, resolvers: collaborationResolvers },
]);

export const supergraphSchema = buildFederatedSchema([
  { typeDefs: baseTypeDefs, resolvers: baseResolvers },
  { typeDefs: insightsTypeDefs, resolvers: insightsResolvers },
  { typeDefs: alertsTypeDefs, resolvers: alertsResolvers },
  { typeDefs: entitiesTypeDefs, resolvers: entitiesResolvers },
  { typeDefs: collaborationTypeDefs, resolvers: collaborationResolvers },
]);
