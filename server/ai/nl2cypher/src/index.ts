import { ApolloServer } from 'apollo-server';
import { typeDefs, resolvers } from './schema.js';
new ApolloServer({ typeDefs, resolvers }).listen({ port: 4020 }).then(({ url }) => console.log(`[nl2cypher] ${url}`));
