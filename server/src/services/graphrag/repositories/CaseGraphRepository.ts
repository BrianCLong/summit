/**
 * Case Graph Repository
 * Retrieves subgraphs from Neo4j for a given case/investigation
 */

import { runCypher } from '../../../graph/neo4j.js';
import logger from '../../../utils/logger.js';
import {
  CaseGraphRepository as ICaseGraphRepository,
  CaseGraphRepositoryParams,
  GraphContext,
  GraphContextNode,
  GraphContextEdge,
} from '../types.js';

const DEFAULT_MAX_NODES = 100;
const DEFAULT_MAX_DEPTH = 3;

export class Neo4jCaseGraphRepository implements ICaseGraphRepository {
  /**
   * Get the subgraph associated with a case/investigation
   */
  async getCaseSubgraph(
    caseId: string,
    params?: CaseGraphRepositoryParams,
  ): Promise<Omit<GraphContext, 'evidenceSnippets'>> {
    const maxNodes = params?.maxNodes ?? DEFAULT_MAX_NODES;
    const maxDepth = params?.maxDepth ?? DEFAULT_MAX_DEPTH;
    const nodeTypeFilters = params?.nodeTypeFilters ?? [];

    try {
      // Build node type filter clause
      const typeFilterClause =
        nodeTypeFilters.length > 0
          ? `AND ANY(label IN labels(n) WHERE label IN $nodeTypes)`
          : '';

      // Query to get nodes connected to the case
      const nodesQuery = `
        MATCH (c:Case {id: $caseId})
        OPTIONAL MATCH path = (c)-[*1..${maxDepth}]-(n)
        WHERE n <> c ${typeFilterClause}
        WITH DISTINCT n
        LIMIT $maxNodes
        RETURN
          n.id AS id,
          labels(n)[0] AS type,
          coalesce(n.name, n.label, n.title, n.id) AS label,
          properties(n) AS properties
      `;

      // Query to get edges within the subgraph
      const edgesQuery = `
        MATCH (c:Case {id: $caseId})
        OPTIONAL MATCH path = (c)-[*1..${maxDepth}]-(n)
        WHERE n <> c ${typeFilterClause}
        WITH DISTINCT n
        LIMIT $maxNodes
        WITH collect(n) + c AS subgraphNodes
        UNWIND subgraphNodes AS source
        MATCH (source)-[r]->(target)
        WHERE target IN subgraphNodes
        RETURN DISTINCT
          id(r) AS id,
          type(r) AS type,
          source.id AS fromId,
          target.id AS toId,
          properties(r) AS properties
      `;

      const [nodesResult, edgesResult] = await Promise.all([
        runCypher<{
          id: string;
          type: string;
          label: string;
          properties: Record<string, any>;
        }>(nodesQuery, {
          caseId,
          maxNodes,
          nodeTypes: nodeTypeFilters,
        }),
        runCypher<{
          id: string;
          type: string;
          fromId: string;
          toId: string;
          properties: Record<string, any>;
        }>(edgesQuery, {
          caseId,
          maxNodes,
          nodeTypes: nodeTypeFilters,
        }),
      ]);

      // Add the case node itself
      const caseNodeResult = await runCypher<{
        id: string;
        type: string;
        label: string;
        properties: Record<string, any>;
      }>(
        `
        MATCH (c:Case {id: $caseId})
        RETURN
          c.id AS id,
          'Case' AS type,
          coalesce(c.name, c.title, c.id) AS label,
          properties(c) AS properties
      `,
        { caseId },
      );

      const nodes: GraphContextNode[] = [
        ...caseNodeResult.map((row) => ({
          id: row.id,
          type: row.type,
          label: row.label,
          properties: this.sanitizeProperties(row.properties),
        })),
        ...nodesResult
          .filter((row) => row.id !== null)
          .map((row) => ({
            id: row.id,
            type: row.type,
            label: row.label,
            properties: this.sanitizeProperties(row.properties),
          })),
      ];

      const edges: GraphContextEdge[] = edgesResult
        .filter((row) => row.fromId && row.toId)
        .map((row) => ({
          id: String(row.id),
          type: row.type,
          fromId: row.fromId,
          toId: row.toId,
          properties: this.sanitizeProperties(row.properties),
        }));

      logger.debug({
        message: 'Case subgraph retrieved',
        caseId,
        nodeCount: nodes.length,
        edgeCount: edges.length,
        maxNodes,
        maxDepth,
      });

      return { nodes, edges };
    } catch (error) {
      logger.error({
        message: 'Failed to retrieve case subgraph',
        caseId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Return empty graph on error to allow graceful degradation
      return { nodes: [], edges: [] };
    }
  }

  /**
   * Sanitize properties to remove sensitive/large fields
   */
  private sanitizeProperties(
    props: Record<string, any>,
  ): Record<string, any> {
    if (!props) return {};

    const sensitiveKeys = [
      'password',
      'secret',
      'token',
      'credential',
      'api_key',
      'apiKey',
    ];
    const largeFieldMaxLength = 500;

    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(props)) {
      // Skip sensitive fields
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
        continue;
      }

      // Truncate large string values
      if (typeof value === 'string' && value.length > largeFieldMaxLength) {
        sanitized[key] = value.substring(0, largeFieldMaxLength) + '...';
      } else if (value !== null && value !== undefined) {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}

/**
 * In-memory implementation for testing
 */
export class InMemoryCaseGraphRepository implements ICaseGraphRepository {
  private nodes: Map<string, GraphContextNode[]> = new Map();
  private edges: Map<string, GraphContextEdge[]> = new Map();

  addCaseData(
    caseId: string,
    nodes: GraphContextNode[],
    edges: GraphContextEdge[],
  ): void {
    this.nodes.set(caseId, nodes);
    this.edges.set(caseId, edges);
  }

  async getCaseSubgraph(
    caseId: string,
    params?: CaseGraphRepositoryParams,
  ): Promise<Omit<GraphContext, 'evidenceSnippets'>> {
    const maxNodes = params?.maxNodes ?? DEFAULT_MAX_NODES;
    const nodeTypeFilters = params?.nodeTypeFilters ?? [];

    let nodes = this.nodes.get(caseId) ?? [];
    let edges = this.edges.get(caseId) ?? [];

    // Apply type filters
    if (nodeTypeFilters.length > 0) {
      nodes = nodes.filter(
        (n) => !n.type || nodeTypeFilters.includes(n.type),
      );
    }

    // Apply max nodes limit
    nodes = nodes.slice(0, maxNodes);

    // Filter edges to only include those with both endpoints in nodes
    const nodeIds = new Set(nodes.map((n) => n.id));
    edges = edges.filter(
      (e) => nodeIds.has(e.fromId) && nodeIds.has(e.toId),
    );

    return { nodes, edges };
  }

  clear(): void {
    this.nodes.clear();
    this.edges.clear();
  }
}

export function createCaseGraphRepository(): ICaseGraphRepository {
  // Use Neo4j in production, in-memory for tests
  if (process.env.NODE_ENV === 'test') {
    return new InMemoryCaseGraphRepository();
  }
  return new Neo4jCaseGraphRepository();
}
