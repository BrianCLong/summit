import { ApolloServer } from 'apollo-server';
import { GraphQLScalarType, Kind } from 'graphql';
import { resolvers as baseResolvers, typeDefs } from './schema';

const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'Arbitrary JSON value',
  serialize: value => value,
  parseValue: value => value,
  parseLiteral(ast) {
    switch (ast.kind) {
      case Kind.STRING:
        return ast.value;
      case Kind.BOOLEAN:
        return ast.value;
      case Kind.INT:
      case Kind.FLOAT:
        return Number(ast.value);
      case Kind.OBJECT:
        return null;
      default:
        return null;
    }
  }
});

const server = new ApolloServer({
  typeDefs,
  resolvers: { ...baseResolvers, JSON: JSONScalar }
});

server.listen({ port: 4010 }).then(({ url }) => console.log(`[prov-ledger] listening at ${url}`));
