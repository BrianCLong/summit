import { Driver, Session } from 'neo4j-driver';
import { logger } from '../utils/logger';
import {
  Graph,
  GraphNode,
  GraphEdge,
  SubgraphQuery,
  GraphRepository as IGraphRepository,
} from '../types/analytics';

/**
 * Neo4j-backed Graph Repository
 *
 * Provides optimized subgraph queries and neighbor retrieval
 * from Neo4j graph database.
 */
export class Neo4jGraphRepository implements IGraphRepository {
  constructor(private driver: Driver) {}

  /**
   * Retrieve a subgraph based on query parameters
   */
  async getSubgraph(params: SubgraphQuery): Promise<Graph> {
    const session = this.driver.session();
    try {
      logger.debug('Fetching subgraph', params);

      // Build node filter
      let nodeFilter = '';
      if (params.nodeIds && params.nodeIds.length > 0) {
        nodeFilter = 'WHERE n.id IN $nodeIds';
      } else if (params.filters?.nodeLabels && params.filters.nodeLabels.length > 0) {
        nodeFilter = 'WHERE any(label in labels(n) WHERE label IN $nodeLabels)';
      }

      // Build edge filter
      let edgeFilter = '';
      if (params.edgeTypes && params.edgeTypes.length > 0) {
        edgeFilter = 'WHERE type(r) IN $edgeTypes';
      }

      const depth = params.depth || 1;
      const limit = params.limit || 1000;

      // Query to fetch subgraph
      const query = `
        MATCH (n)
        ${nodeFilter}
        WITH n LIMIT $limit
        OPTIONAL MATCH path = (n)-[r*1..${depth}]-(m)
        ${edgeFilter}
        WITH collect(DISTINCT n) + collect(DISTINCT m) as allNodes,
             collect(DISTINCT r) as allRels
        UNWIND allNodes as node
        WITH DISTINCT node, allRels
        OPTIONAL MATCH (node)-[rel]-(connected)
        WHERE rel IN [r IN allRels | r]
        RETURN
          COLLECT(DISTINCT {
            id: node.id,
            labels: labels(node),
            properties: properties(node)
          }) as nodes,
          COLLECT(DISTINCT {
            id: id(rel),
            fromId: startNode(rel).id,
            toId: endNode(rel).id,
            type: type(rel),
            properties: properties(rel)
          }) as edges
        LIMIT 1
      `;

      const result = await session.run(query, {
        nodeIds: params.nodeIds || [],
        nodeLabels: params.filters?.nodeLabels || [],
        edgeTypes: params.edgeTypes || [],
        limit,
      });

      if (result.records.length === 0) {
        return { nodes: [], edges: [] };
      }

      const record = result.records[0];
      const nodes: GraphNode[] = record.get('nodes') || [];
      const edges: GraphEdge[] = (record.get('edges') || []).filter(
        (e: GraphEdge | null) => e !== null && e.fromId && e.toId,
      );

      logger.debug('Subgraph fetched', {
        nodes: nodes.length,
        edges: edges.length,
      });

      return {
        nodes: nodes.slice(0, limit),
        edges: edges.slice(0, limit * 2), // Allow more edges than nodes
      };
    } catch (error) {
      logger.error('Error fetching subgraph:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Get neighbors of a node up to specified depth
   */
  async getNeighbors(
    nodeId: string,
    depth: number = 1,
    filters?: Record<string, any>,
  ): Promise<Graph> {
    const session = this.driver.session();
    try {
      logger.debug(`Fetching neighbors for node ${nodeId}`, { depth, filters });

      const edgeFilter = filters?.edgeTypes?.length
        ? 'WHERE type(r) IN $edgeTypes'
        : '';

      const query = `
        MATCH (center {id: $nodeId})
        CALL apoc.path.subgraphNodes(center, {
          maxLevel: $depth,
          relationshipFilter: '${filters?.edgeTypes?.join('|') || ''}',
          direction: '${filters?.direction || 'BOTH'}'
        })
        YIELD node
        WITH DISTINCT node
        OPTIONAL MATCH (node)-[r]-(connected)
        ${edgeFilter}
        WHERE connected IN COLLECT(node)
        RETURN
          COLLECT(DISTINCT {
            id: node.id,
            labels: labels(node),
            properties: properties(node)
          }) as nodes,
          COLLECT(DISTINCT {
            id: id(r),
            fromId: startNode(r).id,
            toId: endNode(r).id,
            type: type(r),
            properties: properties(r)
          }) as edges
      `;

      let result;
      try {
        result = await session.run(query, {
          nodeId,
          depth,
          edgeTypes: filters?.edgeTypes || [],
        });
      } catch (apocError) {
        // Fallback if APOC not available
        logger.warn('APOC not available, using simple path expansion');
        const fallbackQuery = `
          MATCH path = ({id: $nodeId})-[r*1..${depth}]-(neighbor)
          ${edgeFilter}
          WITH DISTINCT neighbor, relationships(path) as rels
          UNWIND rels as rel
          WITH DISTINCT neighbor, rel
          RETURN
            COLLECT(DISTINCT {
              id: neighbor.id,
              labels: labels(neighbor),
              properties: properties(neighbor)
            }) as nodes,
            COLLECT(DISTINCT {
              id: id(rel),
              fromId: startNode(rel).id,
              toId: endNode(rel).id,
              type: type(rel),
              properties: properties(rel)
            }) as edges
        `;

        result = await session.run(fallbackQuery, {
          nodeId,
          edgeTypes: filters?.edgeTypes || [],
        });
      }

      if (result.records.length === 0) {
        return { nodes: [], edges: [] };
      }

      const record = result.records[0];
      const nodes: GraphNode[] = record.get('nodes') || [];
      const edges: GraphEdge[] = (record.get('edges') || []).filter(
        (e: GraphEdge | null) => e !== null,
      );

      logger.debug('Neighbors fetched', {
        nodes: nodes.length,
        edges: edges.length,
      });

      return { nodes, edges };
    } catch (error) {
      logger.error('Error fetching neighbors:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Get all nodes in the graph (with optional limit)
   */
  async getAllNodes(limit: number = 10000): Promise<GraphNode[]> {
    const session = this.driver.session();
    try {
      const query = `
        MATCH (n)
        RETURN
          n.id as id,
          labels(n) as labels,
          properties(n) as properties
        LIMIT $limit
      `;

      const result = await session.run(query, { limit });

      return result.records.map((record) => ({
        id: record.get('id'),
        labels: record.get('labels'),
        properties: record.get('properties'),
      }));
    } finally {
      await session.close();
    }
  }

  /**
   * Get all edges in the graph (with optional limit)
   */
  async getAllEdges(limit: number = 50000): Promise<GraphEdge[]> {
    const session = this.driver.session();
    try {
      const query = `
        MATCH (a)-[r]->(b)
        RETURN
          id(r) as id,
          a.id as fromId,
          b.id as toId,
          type(r) as type,
          properties(r) as properties
        LIMIT $limit
      `;

      const result = await session.run(query, { limit });

      return result.records.map((record) => ({
        id: record.get('id').toString(),
        fromId: record.get('fromId'),
        toId: record.get('toId'),
        type: record.get('type'),
        properties: record.get('properties'),
      }));
    } finally {
      await session.close();
    }
  }
}

/**
 * In-memory Graph Repository for testing
 */
export class InMemoryGraphRepository implements IGraphRepository {
  private graph: Graph;

  constructor(graph: Graph = { nodes: [], edges: [] }) {
    this.graph = graph;
  }

  async getSubgraph(params: SubgraphQuery): Promise<Graph> {
    let nodes = [...this.graph.nodes];
    let edges = [...this.graph.edges];

    // Filter by node IDs
    if (params.nodeIds && params.nodeIds.length > 0) {
      const nodeIdSet = new Set(params.nodeIds);
      nodes = nodes.filter((n) => nodeIdSet.has(n.id));
    }

    // Filter by node labels
    if (params.filters?.nodeLabels && params.filters.nodeLabels.length > 0) {
      const labelSet = new Set(params.filters.nodeLabels);
      nodes = nodes.filter((n) =>
        n.labels.some((label) => labelSet.has(label)),
      );
    }

    // Get connected nodes up to depth
    if (params.depth && params.depth > 0) {
      const nodeIds = new Set(nodes.map((n) => n.id));
      const edgesToInclude = new Set<string>();

      // BFS to find neighbors up to depth
      for (let d = 0; d < params.depth; d++) {
        const currentNodeIds = new Set(nodeIds);
        for (const edge of edges) {
          if (currentNodeIds.has(edge.fromId)) {
            nodeIds.add(edge.toId);
            edgesToInclude.add(edge.id);
          }
          if (currentNodeIds.has(edge.toId)) {
            nodeIds.add(edge.fromId);
            edgesToInclude.add(edge.id);
          }
        }
      }

      nodes = this.graph.nodes.filter((n) => nodeIds.has(n.id));
      edges = this.graph.edges.filter((e) => edgesToInclude.has(e.id));
    }

    // Filter by edge types
    if (params.edgeTypes && params.edgeTypes.length > 0) {
      const edgeTypeSet = new Set(params.edgeTypes);
      edges = edges.filter((e) => edgeTypeSet.has(e.type));
    }

    // Apply limit
    if (params.limit) {
      nodes = nodes.slice(0, params.limit);
      // Keep edges that connect the limited nodes
      const nodeIdSet = new Set(nodes.map((n) => n.id));
      edges = edges.filter(
        (e) => nodeIdSet.has(e.fromId) && nodeIdSet.has(e.toId),
      );
    }

    return { nodes, edges };
  }

  async getNeighbors(
    nodeId: string,
    depth: number = 1,
    filters?: Record<string, any>,
  ): Promise<Graph> {
    const visited = new Set<string>([nodeId]);
    const nodesToExplore = [nodeId];
    const resultEdges: GraphEdge[] = [];

    for (let d = 0; d < depth; d++) {
      const currentLevel: string[] = [];
      for (const currentNodeId of nodesToExplore) {
        for (const edge of this.graph.edges) {
          // Check edge type filter
          if (filters?.edgeTypes && !filters.edgeTypes.includes(edge.type)) {
            continue;
          }

          if (edge.fromId === currentNodeId && !visited.has(edge.toId)) {
            visited.add(edge.toId);
            currentLevel.push(edge.toId);
            resultEdges.push(edge);
          } else if (
            edge.toId === currentNodeId &&
            !visited.has(edge.fromId)
          ) {
            visited.add(edge.fromId);
            currentLevel.push(edge.fromId);
            resultEdges.push(edge);
          }
        }
      }
      nodesToExplore.length = 0;
      nodesToExplore.push(...currentLevel);
    }

    const nodes = this.graph.nodes.filter((n) => visited.has(n.id));

    return { nodes, edges: resultEdges };
  }
}
