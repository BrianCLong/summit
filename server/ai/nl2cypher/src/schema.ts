import { gql } from 'apollo-server';
import { translate, detectRedTeam, NLResult } from './translator';

const history: NLResult[] = [];

export const typeDefs = gql`
  type NLResult { cypher: String!, plan: String!, estimate: Int!, sandboxResult: String }
  type Mutation {
    runNlQuery(text: String!): NLResult!
    undoLastQuery: NLResult
  }
  type Query { _health: String! }
`;

export const resolvers = {
  Query: { _health: () => 'ok' },
  Mutation: {
    runNlQuery: (_: any, { text }: any) => {
      const redFlags = detectRedTeam(text);
      if(redFlags.length){
        console.warn('[nl2cypher] red-team indicators detected', redFlags);
      }
      const result = translate(text);
      history.push(result);
      return result;
    },
    undoLastQuery: () => history.pop() ?? null,
  }
};
