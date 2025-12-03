/**
 * Graph Traversal Algorithms for Contextual Grounding
 * Implements advanced traversal strategies for semantic RAG
 *
 * Key algorithms:
 * - Personalized PageRank for relevance scoring
 * - Metapath-based semantic traversal
 * - Community detection for context expansion
 * - Temporal-aware traversals for CTI/OSINT
 */

import { Driver, Session } from 'neo4j-driver';
import pino from 'pino';
import {
  TraversalConfig,
  TraversalResult,
  TraversalStrategy,
  GraphNode,
  GraphEdge,
  GraphPath,
  GraphNodeSchema,
  GraphEdgeSchema,
} from './types.js';

const logger = pino({ name: 'GraphTraversalAlgorithms' });

export interface TraversalContext {
  investigationId: string;
  focusNodeIds: string[];
  queryEmbedding?: number[];
  temporalWindow?: { start: Date; end: Date };
}

export class GraphTraversalAlgorithms {
  constructor(private driver: Driver) {}

  /**
   * Execute traversal based on configured strategy
   */
  async traverse(
    context: TraversalContext,
    config: TraversalConfig,
  ): Promise<TraversalResult> {
    const startTime = Date.now();

    logger.info({
      strategy: config.strategy,
      focusNodes: context.focusNodeIds.length,
      maxHops: config.maxHops,
    }, 'Starting graph traversal');

    let result: TraversalResult;

    switch (config.strategy) {
      case 'personalized_pagerank':
        result = await this.personalizedPageRank(context, config);
        break;
      case 'metapath':
        result = await this.metapathTraversal(context, config);
        break;
      case 'community_expansion':
        result = await this.communityExpansion(context, config);
        break;
      case 'temporal_aware':
        result = await this.temporalAwareTraversal(context, config);
        break;
      case 'semantic_similarity':
        result = await this.semanticSimilarityTraversal(context, config);
        break;
      case 'bfs':
        result = await this.breadthFirstTraversal(context, config);
        break;
      case 'dfs':
        result = await this.depthFirstTraversal(context, config);
        break;
      default:
        result = await this.breadthFirstTraversal(context, config);
    }

    result.executionTimeMs = Date.now() - startTime;

    logger.info({
      strategy: config.strategy,
      nodesFound: result.nodes.length,
      edgesFound: result.edges.length,
      pathsFound: result.paths.length,
      executionTimeMs: result.executionTimeMs,
    }, 'Graph traversal completed');

    return result;
  }

  /**
   * Personalized PageRank for relevance-based retrieval
   * Computes node importance relative to focus nodes
   */
  private async personalizedPageRank(
    context: TraversalContext,
    config: TraversalConfig,
  ): Promise<TraversalResult> {
    const session = this.driver.session();
    try {
      // Project graph for GDS
      const graphName = `ppr_${context.investigationId}_${Date.now()}`;

      await session.run(`
        CALL gds.graph.project(
          $graphName,
          'Entity',
          {
            RELATED_TO: { orientation: 'UNDIRECTED' },
            RELATIONSHIP: { orientation: 'UNDIRECTED' }
          },
          { nodeProperties: ['confidence'] }
        )
      `, { graphName });

      // Run Personalized PageRank
      const pprResult = await session.run(`
        CALL gds.pageRank.stream($graphName, {
          maxIterations: 20,
          dampingFactor: $dampingFactor,
          sourceNodes: [n IN $focusNodeIds | n]
        })
        YIELD nodeId, score
        WITH nodeId, score
        ORDER BY score DESC
        LIMIT $maxNodes
        MATCH (n) WHERE id(n) = nodeId
        RETURN n.id as id, n.type as type, n.label as label,
               properties(n) as props, score,
               n.embedding as embedding, n.confidence as confidence
      `, {
        graphName,
        dampingFactor: config.dampingFactor,
        focusNodeIds: context.focusNodeIds,
        maxNodes: config.maxNodes,
      });

      // Get edges between high-scoring nodes
      const nodeIds = pprResult.records.map(r => r.get('id'));
      const edgesResult = await session.run(`
        MATCH (a)-[r]->(b)
        WHERE a.id IN $nodeIds AND b.id IN $nodeIds
        RETURN r.id as id, type(r) as type, a.id as sourceId, b.id as targetId,
               properties(r) as props, r.weight as weight, r.confidence as confidence
      `, { nodeIds });

      // Cleanup projection
      await session.run(`CALL gds.graph.drop($graphName)`, { graphName });

      const nodes = this.parseNodes(pprResult.records);
      const edges = this.parseEdges(edgesResult.records);
      const scores = new Map(
        pprResult.records.map(r => [r.get('id'), r.get('score')]),
      );

      return {
        nodes,
        edges,
        paths: await this.extractPaths(session, context.focusNodeIds, nodeIds, config.maxHops),
        scores,
        communities: new Map(),
        executionTimeMs: 0,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Metapath-based traversal for semantic type patterns
   * e.g., ThreatActor -> Campaign -> Malware -> Indicator
   */
  private async metapathTraversal(
    context: TraversalContext,
    config: TraversalConfig,
  ): Promise<TraversalResult> {
    const session = this.driver.session();
    try {
      const metapath = config.metapath || [
        'ThreatActor', 'Campaign', 'Malware', 'Indicator',
      ];

      // Build dynamic Cypher for metapath pattern
      const pathPattern = this.buildMetapathPattern(metapath);

      const result = await session.run(`
        MATCH (start:Entity)
        WHERE start.id IN $focusNodeIds
        ${pathPattern}
        WHERE ALL(n IN nodes(path) WHERE n.confidence >= $minConfidence)
        WITH nodes(path) as pathNodes, relationships(path) as pathRels,
             reduce(score = 1.0, n IN nodes(path) | score * coalesce(n.confidence, 1.0)) as pathScore
        ORDER BY pathScore DESC
        LIMIT $maxNodes
        UNWIND pathNodes as node
        WITH DISTINCT node, pathScore
        RETURN node.id as id, node.type as type, node.label as label,
               properties(node) as props, pathScore as score,
               node.embedding as embedding, node.confidence as confidence
      `, {
        focusNodeIds: context.focusNodeIds,
        minConfidence: config.minConfidence,
        maxNodes: config.maxNodes,
      });

      const nodes = this.parseNodes(result.records);
      const nodeIds = nodes.map(n => n.id);

      const edgesResult = await session.run(`
        MATCH (a)-[r]->(b)
        WHERE a.id IN $nodeIds AND b.id IN $nodeIds
        RETURN r.id as id, type(r) as type, a.id as sourceId, b.id as targetId,
               properties(r) as props, r.weight as weight, r.confidence as confidence
      `, { nodeIds });

      const edges = this.parseEdges(edgesResult.records);
      const scores = new Map(
        result.records.map(r => [r.get('id'), r.get('score')]),
      );

      return {
        nodes,
        edges,
        paths: await this.extractPaths(session, context.focusNodeIds, nodeIds, config.maxHops),
        scores,
        communities: new Map(),
        executionTimeMs: 0,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Community-based expansion for context grouping
   * Uses Louvain algorithm for community detection
   */
  private async communityExpansion(
    context: TraversalContext,
    config: TraversalConfig,
  ): Promise<TraversalResult> {
    const session = this.driver.session();
    try {
      const graphName = `community_${context.investigationId}_${Date.now()}`;

      // Project graph
      await session.run(`
        CALL gds.graph.project(
          $graphName,
          'Entity',
          { RELATED_TO: { orientation: 'UNDIRECTED' } }
        )
      `, { graphName });

      // Run Louvain community detection
      await session.run(`
        CALL gds.louvain.mutate($graphName, {
          mutateProperty: 'communityId'
        })
      `, { graphName });

      // Get communities containing focus nodes
      const communityResult = await session.run(`
        CALL gds.graph.nodeProperty.stream($graphName, 'communityId')
        YIELD nodeId, propertyValue as communityId
        WITH nodeId, communityId
        MATCH (n) WHERE id(n) = nodeId AND n.id IN $focusNodeIds
        WITH DISTINCT communityId
        CALL gds.graph.nodeProperty.stream($graphName, 'communityId')
        YIELD nodeId, propertyValue as comm
        WHERE comm = communityId
        WITH nodeId, comm
        MATCH (n) WHERE id(n) = nodeId
        RETURN n.id as id, n.type as type, n.label as label,
               properties(n) as props, comm as communityId,
               n.embedding as embedding, n.confidence as confidence
        LIMIT $maxNodes
      `, {
        graphName,
        focusNodeIds: context.focusNodeIds,
        maxNodes: config.maxNodes,
      });

      await session.run(`CALL gds.graph.drop($graphName)`, { graphName });

      const nodes = this.parseNodes(communityResult.records);
      const nodeIds = nodes.map(n => n.id);

      // Build community map
      const communities = new Map<string, string[]>();
      for (const record of communityResult.records) {
        const commId = String(record.get('communityId'));
        const nodeId = record.get('id');
        if (!communities.has(commId)) {
          communities.set(commId, []);
        }
        communities.get(commId)!.push(nodeId);
      }

      const edgesResult = await session.run(`
        MATCH (a)-[r]->(b)
        WHERE a.id IN $nodeIds AND b.id IN $nodeIds
        RETURN r.id as id, type(r) as type, a.id as sourceId, b.id as targetId,
               properties(r) as props, r.weight as weight, r.confidence as confidence
      `, { nodeIds });

      const edges = this.parseEdges(edgesResult.records);

      return {
        nodes,
        edges,
        paths: await this.extractPaths(session, context.focusNodeIds, nodeIds, config.maxHops),
        scores: new Map(nodes.map(n => [n.id, n.confidence])),
        communities,
        executionTimeMs: 0,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Temporal-aware traversal for CTI/OSINT analysis
   * Weights edges by temporal proximity and decay
   */
  private async temporalAwareTraversal(
    context: TraversalContext,
    config: TraversalConfig,
  ): Promise<TraversalResult> {
    const session = this.driver.session();
    try {
      const now = new Date();
      const temporalWindow = context.temporalWindow || {
        start: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), // 90 days
        end: now,
      };

      const result = await session.run(`
        MATCH (start:Entity)
        WHERE start.id IN $focusNodeIds
        CALL apoc.path.spanningTree(start, {
          maxLevel: $maxHops,
          relationshipFilter: 'RELATED_TO>|RELATIONSHIP>',
          labelFilter: 'Entity'
        }) YIELD path
        WITH path, nodes(path) as pathNodes, relationships(path) as pathRels
        WHERE ALL(n IN pathNodes WHERE
          n.timestamp IS NULL OR
          (datetime(n.timestamp) >= datetime($startTime) AND
           datetime(n.timestamp) <= datetime($endTime))
        )
        WITH path, pathNodes, pathRels,
             reduce(score = 1.0, n IN pathNodes |
               CASE WHEN n.timestamp IS NOT NULL
                 THEN score * (1 - $temporalDecay * duration.inDays(datetime(n.timestamp), datetime()).days / 365.0)
                 ELSE score
               END
             ) as temporalScore
        ORDER BY temporalScore DESC
        LIMIT $maxNodes
        UNWIND pathNodes as node
        WITH DISTINCT node, max(temporalScore) as score
        RETURN node.id as id, node.type as type, node.label as label,
               properties(node) as props, score,
               node.embedding as embedding, node.confidence as confidence,
               node.timestamp as timestamp
      `, {
        focusNodeIds: context.focusNodeIds,
        maxHops: config.maxHops,
        startTime: temporalWindow.start.toISOString(),
        endTime: temporalWindow.end.toISOString(),
        temporalDecay: config.temporalDecay,
        maxNodes: config.maxNodes,
      });

      const nodes = this.parseNodes(result.records);
      const nodeIds = nodes.map(n => n.id);

      const edgesResult = await session.run(`
        MATCH (a)-[r]->(b)
        WHERE a.id IN $nodeIds AND b.id IN $nodeIds
        RETURN r.id as id, type(r) as type, a.id as sourceId, b.id as targetId,
               properties(r) as props, r.weight as weight, r.confidence as confidence,
               r.timestamp as timestamp
      `, { nodeIds });

      const edges = this.parseEdges(edgesResult.records);
      const scores = new Map(
        result.records.map(r => [r.get('id'), r.get('score')]),
      );

      return {
        nodes,
        edges,
        paths: await this.extractPaths(session, context.focusNodeIds, nodeIds, config.maxHops),
        scores,
        communities: new Map(),
        executionTimeMs: 0,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Semantic similarity traversal using embeddings
   * Combines graph structure with vector similarity
   */
  private async semanticSimilarityTraversal(
    context: TraversalContext,
    config: TraversalConfig,
  ): Promise<TraversalResult> {
    const session = this.driver.session();
    try {
      if (!context.queryEmbedding) {
        // Fallback to BFS if no embedding provided
        return this.breadthFirstTraversal(context, config);
      }

      // Find nodes by embedding similarity
      const result = await session.run(`
        MATCH (n:Entity)
        WHERE n.investigationId = $investigationId AND n.embedding IS NOT NULL
        WITH n, gds.similarity.cosine(n.embedding, $queryEmbedding) as similarity
        WHERE similarity >= $minConfidence
        ORDER BY similarity DESC
        LIMIT $maxNodes
        RETURN n.id as id, n.type as type, n.label as label,
               properties(n) as props, similarity as score,
               n.embedding as embedding, n.confidence as confidence
      `, {
        investigationId: context.investigationId,
        queryEmbedding: context.queryEmbedding,
        minConfidence: config.minConfidence,
        maxNodes: config.maxNodes,
      });

      const semanticNodes = this.parseNodes(result.records);
      const semanticNodeIds = semanticNodes.map(n => n.id);

      // Expand from focus nodes AND semantic matches
      const allFocusIds = [...new Set([...context.focusNodeIds, ...semanticNodeIds.slice(0, 10)])];

      const expansionResult = await session.run(`
        MATCH (start:Entity)
        WHERE start.id IN $focusIds
        CALL apoc.path.subgraphNodes(start, {
          maxLevel: $maxHops,
          relationshipFilter: 'RELATED_TO>|RELATIONSHIP>',
          labelFilter: 'Entity'
        }) YIELD node
        WITH DISTINCT node
        WHERE node.confidence >= $minConfidence
        RETURN node.id as id, node.type as type, node.label as label,
               properties(node) as props, node.confidence as score,
               node.embedding as embedding, node.confidence as confidence
        LIMIT $maxNodes
      `, {
        focusIds: allFocusIds,
        maxHops: config.maxHops,
        minConfidence: config.minConfidence,
        maxNodes: config.maxNodes,
      });

      // Merge semantic and expansion results
      const allNodes = [...semanticNodes];
      const seenIds = new Set(semanticNodes.map(n => n.id));

      for (const record of expansionResult.records) {
        const id = record.get('id');
        if (!seenIds.has(id)) {
          allNodes.push(this.parseNodeRecord(record));
          seenIds.add(id);
        }
      }

      const nodeIds = allNodes.map(n => n.id);

      const edgesResult = await session.run(`
        MATCH (a)-[r]->(b)
        WHERE a.id IN $nodeIds AND b.id IN $nodeIds
        RETURN r.id as id, type(r) as type, a.id as sourceId, b.id as targetId,
               properties(r) as props, r.weight as weight, r.confidence as confidence
      `, { nodeIds });

      const edges = this.parseEdges(edgesResult.records);
      const scores = new Map(
        result.records.map(r => [r.get('id'), r.get('score')]),
      );

      return {
        nodes: allNodes.slice(0, config.maxNodes),
        edges,
        paths: await this.extractPaths(session, context.focusNodeIds, nodeIds, config.maxHops),
        scores,
        communities: new Map(),
        executionTimeMs: 0,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Standard BFS traversal
   */
  private async breadthFirstTraversal(
    context: TraversalContext,
    config: TraversalConfig,
  ): Promise<TraversalResult> {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (start:Entity)
        WHERE start.id IN $focusNodeIds
        CALL apoc.path.subgraphAll(start, {
          maxLevel: $maxHops,
          relationshipFilter: 'RELATED_TO>|RELATIONSHIP>',
          labelFilter: 'Entity',
          bfs: true
        }) YIELD nodes, relationships
        UNWIND nodes as node
        WITH DISTINCT node
        WHERE node.confidence >= $minConfidence
        RETURN node.id as id, node.type as type, node.label as label,
               properties(node) as props, node.confidence as score,
               node.embedding as embedding, node.confidence as confidence
        LIMIT $maxNodes
      `, {
        focusNodeIds: context.focusNodeIds,
        maxHops: config.maxHops,
        minConfidence: config.minConfidence,
        maxNodes: config.maxNodes,
      });

      const nodes = this.parseNodes(result.records);
      const nodeIds = nodes.map(n => n.id);

      const edgesResult = await session.run(`
        MATCH (a)-[r]->(b)
        WHERE a.id IN $nodeIds AND b.id IN $nodeIds
        RETURN r.id as id, type(r) as type, a.id as sourceId, b.id as targetId,
               properties(r) as props, r.weight as weight, r.confidence as confidence
      `, { nodeIds });

      const edges = this.parseEdges(edgesResult.records);
      const scores = new Map(nodes.map(n => [n.id, n.confidence]));

      return {
        nodes,
        edges,
        paths: await this.extractPaths(session, context.focusNodeIds, nodeIds, config.maxHops),
        scores,
        communities: new Map(),
        executionTimeMs: 0,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * DFS traversal for deep path exploration
   */
  private async depthFirstTraversal(
    context: TraversalContext,
    config: TraversalConfig,
  ): Promise<TraversalResult> {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (start:Entity)
        WHERE start.id IN $focusNodeIds
        CALL apoc.path.subgraphAll(start, {
          maxLevel: $maxHops,
          relationshipFilter: 'RELATED_TO>|RELATIONSHIP>',
          labelFilter: 'Entity',
          bfs: false
        }) YIELD nodes, relationships
        UNWIND nodes as node
        WITH DISTINCT node
        WHERE node.confidence >= $minConfidence
        RETURN node.id as id, node.type as type, node.label as label,
               properties(node) as props, node.confidence as score,
               node.embedding as embedding, node.confidence as confidence
        LIMIT $maxNodes
      `, {
        focusNodeIds: context.focusNodeIds,
        maxHops: config.maxHops,
        minConfidence: config.minConfidence,
        maxNodes: config.maxNodes,
      });

      const nodes = this.parseNodes(result.records);
      const nodeIds = nodes.map(n => n.id);

      const edgesResult = await session.run(`
        MATCH (a)-[r]->(b)
        WHERE a.id IN $nodeIds AND b.id IN $nodeIds
        RETURN r.id as id, type(r) as type, a.id as sourceId, b.id as targetId,
               properties(r) as props, r.weight as weight, r.confidence as confidence
      `, { nodeIds });

      const edges = this.parseEdges(edgesResult.records);
      const scores = new Map(nodes.map(n => [n.id, n.confidence]));

      return {
        nodes,
        edges,
        paths: await this.extractPaths(session, context.focusNodeIds, nodeIds, config.maxHops),
        scores,
        communities: new Map(),
        executionTimeMs: 0,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Extract paths between focus nodes and retrieved nodes
   */
  private async extractPaths(
    session: Session,
    focusNodeIds: string[],
    targetNodeIds: string[],
    maxHops: number,
  ): Promise<GraphPath[]> {
    if (focusNodeIds.length === 0 || targetNodeIds.length === 0) {
      return [];
    }

    const result = await session.run(`
      MATCH (start:Entity), (end:Entity)
      WHERE start.id IN $focusNodeIds AND end.id IN $targetNodeIds AND start.id <> end.id
      MATCH path = shortestPath((start)-[*1..${maxHops}]->(end))
      WITH path, nodes(path) as pathNodes, relationships(path) as pathRels,
           reduce(score = 1.0, n IN nodes(path) | score * coalesce(n.confidence, 1.0)) as pathScore
      ORDER BY pathScore DESC
      LIMIT 50
      RETURN [n IN pathNodes | {
        id: n.id, type: n.type, label: n.label,
        properties: properties(n), confidence: n.confidence
      }] as nodes,
      [r IN pathRels | {
        id: r.id, type: type(r), sourceId: startNode(r).id, targetId: endNode(r).id,
        properties: properties(r), weight: r.weight, confidence: r.confidence
      }] as edges,
      pathScore as score
    `, { focusNodeIds, targetNodeIds });

    return result.records.map(record => {
      const nodes = (record.get('nodes') || []).map((n: any) =>
        GraphNodeSchema.parse({
          id: n.id,
          type: n.type || 'Entity',
          label: n.label || n.id,
          properties: n.properties || {},
          confidence: n.confidence || 1.0,
        }),
      );

      const edges = (record.get('edges') || []).map((e: any) =>
        GraphEdgeSchema.parse({
          id: e.id || `${e.sourceId}-${e.targetId}`,
          type: e.type || 'RELATED_TO',
          sourceId: e.sourceId,
          targetId: e.targetId,
          properties: e.properties || {},
          weight: e.weight || 1.0,
          confidence: e.confidence || 1.0,
        }),
      );

      return {
        nodes,
        edges,
        score: record.get('score') || 1.0,
        semanticRelevance: 1.0,
        temporalCoherence: 1.0,
      };
    });
  }

  /**
   * Build Cypher pattern for metapath traversal
   */
  private buildMetapathPattern(metapath: string[]): string {
    if (metapath.length < 2) {
      return 'MATCH path = (start)';
    }

    const segments = metapath.map((type, i) => {
      if (i === 0) return '';
      return `-[:RELATED_TO|RELATIONSHIP]->(n${i}:Entity)`;
    });

    const whereClause = metapath
      .map((type, i) => {
        if (i === 0) return `start.type = '${type}'`;
        return `n${i}.type = '${type}'`;
      })
      .join(' AND ');

    return `MATCH path = (start)${segments.join('')} WHERE ${whereClause}`;
  }

  /**
   * Parse Neo4j records to GraphNode array
   */
  private parseNodes(records: any[]): GraphNode[] {
    return records.map(record => this.parseNodeRecord(record));
  }

  private parseNodeRecord(record: any): GraphNode {
    const props = record.get('props') || {};
    return GraphNodeSchema.parse({
      id: record.get('id'),
      type: record.get('type') || 'Entity',
      label: record.get('label') || record.get('id'),
      properties: typeof props === 'string' ? JSON.parse(props) : props,
      embedding: record.get('embedding') || undefined,
      confidence: record.get('confidence') || 1.0,
      timestamp: record.get('timestamp') || undefined,
    });
  }

  /**
   * Parse Neo4j records to GraphEdge array
   */
  private parseEdges(records: any[]): GraphEdge[] {
    return records.map(record => {
      const props = record.get('props') || {};
      return GraphEdgeSchema.parse({
        id: record.get('id') || `${record.get('sourceId')}-${record.get('targetId')}`,
        type: record.get('type') || 'RELATED_TO',
        sourceId: record.get('sourceId'),
        targetId: record.get('targetId'),
        properties: typeof props === 'string' ? JSON.parse(props) : props,
        weight: record.get('weight') || 1.0,
        confidence: record.get('confidence') || 1.0,
        timestamp: record.get('timestamp') || undefined,
      });
    });
  }
}
