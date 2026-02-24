import { AdjacencyList, explainDegreeCentrality, explainCommunity } from '../graph/xai';
import { getNeo4jDriver } from '../config/database';

/**
 * Service to generate explanations for graph analytics results.
 * Fetches relevant subgraphs from Neo4j and applies pure XAI logic.
 */
export class GraphXAIService {
  private static instance: GraphXAIService;
  private driver: any; // Type 'any' to avoid strict dependency on neo4j-driver types in this prototype

  private constructor() {
    this.driver = getNeo4jDriver();
  }

  public static getInstance(): GraphXAIService {
    if (!GraphXAIService.instance) {
      GraphXAIService.instance = new GraphXAIService();
    }
    return GraphXAIService.instance;
  }

  /**
   * Explains why a node has high centrality by looking at its 2-hop neighborhood.
   * @param nodeId The target node ID
   */
  async explainNodeCentrality(nodeId: string): Promise<any> {
    const session = this.driver.session();
    try {
      // Fetch 2-hop subgraph
      const result = await session.run(
        `
        MATCH (n {id: $nodeId})-[r*1..2]-(m)
        RETURN n.id as source, m.id as target, labels(m) as labels
        LIMIT 1000
        `,
        { nodeId }
      );

      const graph: AdjacencyList = new Map();

      // Populate graph from query results
      // We need to build the adjacency list carefully.
      // The query returns paths. Let's simplify and just get edge list.

      // Better Query for Adjacency construction
      const edgeResult = await session.run(
        `
        MATCH (n {id: $nodeId})
        OPTIONAL MATCH (n)-[]-(m)
        RETURN n.id as u, m.id as v
        UNION
        MATCH (n {id: $nodeId})-[]-(m)-[]-(k)
        RETURN m.id as u, k.id as v
        LIMIT 2000
        `,
        { nodeId }
      );

      edgeResult.records.forEach((record: any) => {
        const u = record.get('u');
        const v = record.get('v');

        if (u && v) {
          if (!graph.has(u)) graph.set(u, []);
          if (!graph.has(v)) graph.set(v, []);

          // Undirected graph assumption for this explanation
          graph.get(u)?.push(v);
          graph.get(v)?.push(u);
        }
      });

      // Pure Logic Calculation
      const explanation = explainDegreeCentrality(graph, nodeId, 5);

      return {
        target: nodeId,
        type: 'degree_centrality_explanation',
        top_contributors: explanation
      };

    } finally {
      await session.close();
    }
  }

  /**
   * Explains community assignment
   */
  async explainNodeCommunity(nodeId: string): Promise<any> {
    const session = this.driver.session();
    try {
      // Fetch neighbors and their labels
      const result = await session.run(
        `
             MATCH (n {id: $nodeId})-->(m)
             RETURN n.id as nid, labels(n) as nlabels, m.id as mid, labels(m) as mlabels
             LIMIT 100
             `,
        { nodeId }
      );

      const graph: AdjacencyList = new Map();
      const communities = new Map<string, string>();

      result.records.forEach((record: any) => {
        const nid = record.get('nid');
        const mid = record.get('mid');
        const nlabels = record.get('nlabels');
        const mlabels = record.get('mlabels');

        if (!graph.has(nid)) graph.set(nid, []);
        graph.get(nid)?.push(mid);

        // Naive community = First Label
        if (nlabels && nlabels[0]) communities.set(nid, nlabels[0]);
        if (mlabels && mlabels[0]) communities.set(mid, mlabels[0]);
      });

      const explanation = explainCommunity(graph, communities, nodeId);

      return {
        target: nodeId,
        type: 'community_homophily_explanation',
        breakdown: explanation
      };
    } finally {
      await session.close();
    }
  }
}
