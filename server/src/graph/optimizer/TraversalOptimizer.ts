// @ts-nocheck
import { QueryAnalysis, TraversalStrategy } from './types.js';

export class TraversalOptimizer {
  /**
   * Generates an optimized traversal query based on intent and strategy.
   * Focuses on OSINT patterns like shortest path, neighborhood expansion, and common connections.
   */
  public optimize(strategy: TraversalStrategy, params: Record<string, unknown>): string {
    switch (strategy.type) {
      case 'shortest_path':
        return this.generateShortestPathQuery(strategy, params);
      case 'all_simple_paths':
        return this.generateAllSimplePathsQuery(strategy, params);
      case 'apoc_subgraph':
        return this.generateApocSubgraphQuery(strategy, params);
      case 'native_expansion':
        return this.generateNativeExpansionQuery(strategy, params);
      case 'gds':
        return this.generateGDSQuery(strategy, params);
      default:
        throw new Error(`Unsupported traversal strategy: ${strategy.type}`);
    }
  }

  private sanitizeRelTypes(types: string[] | undefined): string {
    if (!types || types.length === 0) return '';
    // strict validation: only allow alphanumeric and underscores
    const validTypes = types.filter(t => /^[a-zA-Z0-9_]+$/.test(t));
    if (validTypes.length === 0) return '';
    // Join with backticks just in case, though regex enforces safety
    return `:${validTypes.map(t => `\`${t}\``).join('|')}`;
  }

  private generateShortestPathQuery(strategy: TraversalStrategy, params: Record<string, unknown>): string {
    const maxDepth = strategy.maxDepth || 5;
    const limit = strategy.limit || 1;
    // Expects params: { startId, endId, relationshipTypes?, direction? }
    const relTypes = this.sanitizeRelTypes(params.relationshipTypes as string[] | undefined);
    const dirStart = params.direction === 'INCOMING' ? '<' : '';
    const dirEnd = params.direction === 'OUTGOING' ? '>' : '';

    return `
      MATCH (start {id: $startId}), (end {id: $endId})
      MATCH p = shortestPath((start)${dirStart}-[r${relTypes}*..${maxDepth}]-${dirEnd}(end))
      RETURN p
      LIMIT ${limit}
    `;
  }

  private generateAllSimplePathsQuery(strategy: TraversalStrategy, params: Record<string, unknown>): string {
    const maxDepth = strategy.maxDepth || 3;
    const limit = strategy.limit || 10;
    const relTypes = this.sanitizeRelTypes(params.relationshipTypes as string[] | undefined);

    return `
      MATCH (start {id: $startId}), (end {id: $endId})
      MATCH p = allShortestPaths((start)-[r${relTypes}*..${maxDepth}]-(end))
      RETURN p
      LIMIT ${limit}
    `;
  }

  private generateApocSubgraphQuery(strategy: TraversalStrategy, params: Record<string, unknown>): string {
    const maxLevel = strategy.maxDepth || 2;
    // APOC is more efficient for broad expansion
    // APOC procedures take filter strings, validation is handled by caller or APOC logic,
    // but we should still be careful if we construct it.
    // Here we pass params directly to APOC which is safer as parameterization.
    return `
      MATCH (start {id: $startId})
      CALL apoc.path.subgraphNodes(start, {
        maxLevel: ${maxLevel},
        relationshipFilter: $relationshipFilter,
        labelFilter: $labelFilter,
        limit: ${strategy.limit || 1000}
      })
      YIELD node
      RETURN node
    `;
  }

  private generateNativeExpansionQuery(strategy: TraversalStrategy, params: Record<string, unknown>): string {
    const hops = strategy.maxDepth || 2;
    const relTypes = this.sanitizeRelTypes(params.relationshipTypes as string[] | undefined);

    // Optimized native expansion using pattern comprehension or simple MATCH
    // For 1 hop
    if (hops === 1) {
        return `
            MATCH (start {id: $startId})-[r${relTypes}]-(neighbor)
            RETURN start, r, neighbor
            LIMIT ${strategy.limit || 100}
        `;
    }

    // For multi-hop
    return `
        MATCH (start {id: $startId})
        CALL {
            WITH start
            MATCH (start)-[r${relTypes}*1..${hops}]-(neighbor)
            RETURN neighbor
            LIMIT ${strategy.limit || 100}
        }
        RETURN DISTINCT neighbor
    `;
  }

  private generateGDSQuery(strategy: TraversalStrategy, params: Record<string, unknown>): string {
     // Placeholder for Graph Data Science integration
     // e.g., PageRank, Centrality
     const algo = strategy.algorithmConfig?.name || 'pageRank';
     // whitelist allowed algos
     const allowedAlgos = ['pageRank', 'articleRank', 'eigenvector', 'betweenness', 'closeness'];
     if (!allowedAlgos.includes(algo)) {
         throw new Error(`Algorithm ${algo} not allowed`);
     }

     return `
        CALL gds.${algo}.stream($graphName, $config)
        YIELD nodeId, score
        RETURN gds.util.asNode(nodeId) AS node, score
        ORDER BY score DESC
        LIMIT ${strategy.limit || 10}
     `;
  }
}
