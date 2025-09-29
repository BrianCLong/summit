import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

const PORT = Number(process.env.PORT || 4310);

const typeDefs = /* GraphQL */ `
  scalar JSON
  input ConductInput { task: String!, maxLatencyMs: Int = 4000, sensitivity: String = "low" }
  type RoutingDecision { expert: String!, reason: String!, confidence: Float! }
  type ConductResult { expertId: String!, output: JSON, cost: Float!, latencyMs: Int!, auditId: ID }
  type Query { _health: String!, previewRouting(input: ConductInput!): RoutingDecision! }
  type Mutation { conduct(input: ConductInput!): ConductResult! }
`;

const resolvers = {
  Query: {
    _health: () => 'ok',
    previewRouting: (_p, { input }) => {
      const t = String(input.task || '').toLowerCase();
      if (/(cypher|graph|pagerank|betweenness|neighbors|neo4j)/.test(t))
        return { expert: 'G  PH_TOOL', reason: 'graph keywords', confidence: 0.92 };
      if (input.maxLatencyMs < 1500)
        return { expert: 'LLM_LIGHT', reason: 'tight latency', confidence: 0.78 };
      return { expert: 'RAG_TOOL', reason: 'default', confidence: 0.60 };
    },
  },
  Mutation: {
    conduct: (_p, { input }) => ({
      expertId: 'RAG_TOOL',
      output: { echoedTask: input.task },
      cost: 0.001,
      latencyMs: 120,
      auditId: `dev-${Date.now()}`
    }),
  },
};

const apollo = new ApolloServer({ typeDefs, resolvers, introspection: true });
const { url } = await startStandaloneServer(apollo, {
  listen: { port: PORT, host: '0.0.0.0' },
});
console.log(`[conductor] listening on ${url} (standalone; GraphQL is at "/")`);
