import { gql } from 'graphql-tag';
export const typeDefs = gql`
  type PathExplain {
    cypher: String!
    policyExcluded: [ID!]!
    rationale: String!
  }
  type PathResult {
    nodes: [ID!]!
    edges: [ID!]!
    explain: PathExplain!
  }
  extend type Query {
    shortestPathPolicyAware(
      from: ID!
      to: ID!
      excludeLabels: [String!]!
    ): PathResult!
  }
`;
export const resolvers = {
  Query: {
    shortestPathPolicyAware: async (
      _: any,
      { from, to, excludeLabels },
      ctx,
    ) => {
      const cypher = `
        MATCH (a {id:$from}), (b {id:$to})
        CALL algo.shortestPath.stream(a,b)
        YIELD nodeId
        WITH nodeId
        WHERE NONE(l IN labels(node(nodeId)) WHERE l IN $excludeLabels)
        RETURN collect(id(node(nodeId))) AS nodes`;
      const explain = {
        cypher,
        policyExcluded: excludeLabels,
        rationale: 'Excluded by ABAC/OPA',
      };
      const { nodes, edges } = await ctx.neo4j.run(cypher, {
        from,
        to,
        excludeLabels,
      });
      return { nodes, edges, explain };
    },
  },
};
