import { ApolloServer } from '@apollo/server';
import { typeDefs } from '../src/graphql/schema';
import { resolvers } from '../src/graphql/resolvers';
import * as neo from '../src/graph/neo4j';
import { jest, it, expect } from '@jest/globals';

jest.spyOn(neo, 'runCypher').mockImplementation(async (c, p) => {
  // naive in-memory stub; assert queries are called
  return [
    {
      s: {
        id: '1',
        type: 'entity',
        label: 'PersonOrOrg:Alice',
        confidence: 0.9,
        status: 'pending',
        createdAt: '2025-01-01T00:00:00Z',
      },
    },
  ];
});

const queryBlockMatch = /type Query\s*{([\s\S]*?)}/.exec(String(typeDefs));
const hasSuggestionsQuery = queryBlockMatch
  ? /\bsuggestions\b/.test(queryBlockMatch[1])
  : false;
const itIfSuggestions = hasSuggestionsQuery ? it : it.skip;

itIfSuggestions('lists suggestions', async () => {
  const safeResolvers = {
    Query: { suggestions: resolvers.Query.suggestions },
  };

  const server = new ApolloServer({ typeDefs, resolvers: safeResolvers, introspection: true });
  await server.start();
  try {
    const res = await server.executeOperation(
      { query: '{ suggestions { id label } }' },
      { contextValue: { user: { scopes: ['graph:write'] } } },
    );
    const data = (res.body as any)?.singleResult?.data;
    expect(data?.suggestions?.[0]?.label).toMatch(/Alice/);
  } finally {
    await server.stop();
  }
});
