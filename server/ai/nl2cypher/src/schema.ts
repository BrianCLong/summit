import { gql } from 'apollo-server';
import { runQuery, undo } from './engine';

export const typeDefs = gql`
  type NLResult { cypher: String!, plan: String!, estimate: Int!, sandboxResult: String }
  type Mutation {
    runNlQuery(sessionId: ID!, text: String!): NLResult!
    undoLastQuery(sessionId: ID!): NLResult!
  }
  type Query { _health: String! }
`;

export const resolvers = {
  Query: { _health: () => 'ok' },
  Mutation: {
    runNlQuery: (_: any, { sessionId, text }: { sessionId: string; text: string }) => runQuery(sessionId, text),
    undoLastQuery: (_: any, { sessionId }: { sessionId: string }) => undo(sessionId)
  }
};
