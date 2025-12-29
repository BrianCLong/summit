import { gql } from 'apollo-server';
import { translateQuery } from './translator';

export const typeDefs = gql`
  type NLResult { cypher: String!, plan: String!, estimate: Int!, sandboxResult: String, redFlagged: Boolean! }
  type Mutation { runNlQuery(text: String!, sessionId: String): NLResult! }
  type Query { _health: String!, undo(sessionId: String!): NLResult }
`;

const sessionHistory = new Map<string, { cypher: string; plan: string; estimate: number; sandboxResult: string; redFlagged: boolean }[]>();

function record(sessionId: string, result: NLResult): void {
  if (!sessionId) return;
  const stack = sessionHistory.get(sessionId) ?? [];
  stack.push(result);
  sessionHistory.set(sessionId, stack);
}

function undo(sessionId: string): NLResult | null {
  const stack = sessionHistory.get(sessionId);
  if (!stack || !stack.length) return null;
  stack.pop();
  const previous = stack.at(-1) ?? null;
  sessionHistory.set(sessionId, stack);
  return previous ?? null;
}

export interface NLResult {
  cypher: string;
  plan: string;
  estimate: number;
  sandboxResult: string;
  redFlagged: boolean;
}

export const resolvers = {
  Query: {
    _health: () => 'ok',
    undo: (_: unknown, { sessionId }: { sessionId: string }) => undo(sessionId),
  },
  Mutation: {
    runNlQuery: (_: unknown, { text, sessionId }: { text: string; sessionId?: string }) => {
      const result = translateQuery(text);
      record(sessionId ?? '', result);
      return result;
    },
  },
};
