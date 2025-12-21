import { gql } from 'apollo-server';

export const typeDefs = gql`
  type NLResult { cypher: String!, plan: String!, estimate: Int!, sandboxResult: String }
  type Mutation { runNlQuery(text: String!): NLResult! }
  type Query { _health: String! }
`;

export const resolvers = {
  Query: { _health: () => 'ok' },
  Mutation: {
    runNlQuery: (_: any, { text }: any) => ({
      cypher: 'MATCH (a)-[:FOLLOWS]->(b) RETURN a,b',
      plan: 'Projected simple plan',
      estimate: 42,
      sandboxResult: 'rows: 0'
    })
  }
};
