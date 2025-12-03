/**
 * Graph-Aware Retriever
 * Multi-hop graph traversal with saliency scoring for evidence retrieval
 */

import { Driver, Session } from 'neo4j-driver';
import { v4 as uuidv4 } from 'uuid';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import {
  RetrievalQuery,
  RetrievalResult,
  EvidenceChunk,
  GraphPath,
  CitationSource,
} from '../types/index.js';

const tracer = trace.getTracer('graphrag-retriever');

export interface GraphRetrieverConfig {
  maxHops: number;
  maxNodes: number;
  minRelevance: number;
  useBetweenness: boolean;
  usePageRank: boolean;
}

interface SubgraphNode {
  id: string;
  type: string;
  label: string;
  properties: Record<string, any>;
  saliency: number;
  embedding?: number[];
}

interface SubgraphEdge {
  id: string;
  type: string;
  sourceId: string;
  targetId: string;
  weight?: number;
}

export class GraphRetriever {
  private config: GraphRetrieverConfig;

  constructor(
    private driver: Driver,
    config: Partial<GraphRetrieverConfig> = {},
  ) {
    this.config = {
      maxHops: config.maxHops ?? 3,
      maxNodes: config.maxNodes ?? 1000,
      minRelevance: config.minRelevance ?? 0.3,
      useBetweenness: config.useBetweenness ?? true,
      usePageRank: config.usePageRank ?? true,
    };
  }

  /**
   * Retrieve relevant subgraph based on query entities
   */
  async retrieve(query: RetrievalQuery): Promise<RetrievalResult> {
    return tracer.startActiveSpan('graph_retrieval', async (span) => {
      const startTime = Date.now();
      const session = this.driver.session();

      try {
        span.setAttribute('query.length', query.query.length);
        span.setAttribute('query.maxHops', query.maxHops);
        span.setAttribute('query.tenantId', query.tenantId);

        // Step 1: Find seed entities from query
        const seedEntities = await this.findSeedEntities(session, query);
        span.setAttribute('seedEntities.count', seedEntities.length);

        if (seedEntities.length === 0) {
          return this.emptyResult(query, startTime);
        }

        // Step 2: Expand subgraph from seed entities
        const subgraph = await this.expandSubgraph(
          session,
          seedEntities,
          query.maxHops,
          query.tenantId,
          query.relationshipFilters,
        );
        span.setAttribute('subgraph.nodes', subgraph.nodes.length);
        span.setAttribute('subgraph.edges', subgraph.edges.length);

        // Step 3: Compute saliency scores
        const scoredSubgraph = await this.computeSaliency(session, subgraph);

        // Step 4: Extract evidence paths
        const graphPaths = await this.extractEvidencePaths(
          session,
          seedEntities,
          scoredSubgraph,
          query,
        );

        // Step 5: Build evidence chunks with citations
        const evidenceChunks = await this.buildEvidenceChunks(
          session,
          scoredSubgraph,
          graphPaths,
          query,
        );

        const result: RetrievalResult = {
          id: uuidv4(),
          query: query.query,
          evidenceChunks,
          subgraph: {
            nodes: scoredSubgraph.nodes,
            edges: scoredSubgraph.edges,
          },
          totalDocumentsSearched: 0, // Will be populated by document retriever
          totalNodesTraversed: subgraph.nodes.length,
          processingTimeMs: Date.now() - startTime,
        };

        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      } finally {
        await session.close();
        span.end();
      }
    });
  }

  /**
   * Find seed entities matching the query
   */
  private async findSeedEntities(
    session: Session,
    query: RetrievalQuery,
  ): Promise<string[]> {
    // Use full-text search to find matching entities
    const result = await session.run(
      `
      CALL db.index.fulltext.queryNodes('entitySearch', $query)
      YIELD node, score
      WHERE score >= $minScore
      RETURN node.id as id, score
      ORDER BY score DESC
      LIMIT $limit
      `,
      {
        query: query.query,
        minScore: query.minRelevance,
        limit: Math.min(query.maxNodes / 10, 100),
      },
    );

    return result.records.map((r) => r.get('id'));
  }

  /**
   * Expand subgraph from seed entities using BFS
   */
  private async expandSubgraph(
    session: Session,
    seedEntities: string[],
    maxHops: number,
    tenantId: string,
    relationshipFilters?: string[],
  ): Promise<{ nodes: SubgraphNode[]; edges: SubgraphEdge[] }> {
    const relTypeFilter = relationshipFilters
      ? relationshipFilters.map((r) => `'${r}'`).join(', ')
      : null;

    const relClause = relTypeFilter
      ? `AND type(r) IN [${relTypeFilter}]`
      : '';

    const result = await session.run(
      `
      UNWIND $seedIds as seedId
      MATCH (seed {id: seedId})
      CALL {
        WITH seed
        MATCH path = (seed)-[r*1..${maxHops}]-(connected)
        WHERE ALL(rel IN relationships(path) WHERE
          NOT EXISTS(rel.tenantId) OR rel.tenantId = $tenantId
        ) ${relClause}
        WITH connected, relationships(path) as rels
        LIMIT $maxNodes
        RETURN connected, rels
      }
      WITH collect(DISTINCT connected) as nodes,
           collect(DISTINCT rels) as allRels
      UNWIND nodes as n
      OPTIONAL MATCH (n)-[r]-()
      WHERE r IN flatten(allRels)
      RETURN DISTINCT n, labels(n) as labels, collect(DISTINCT r) as rels
      `,
      {
        seedIds: seedEntities,
        tenantId,
        maxNodes: this.config.maxNodes,
      },
    );

    const nodesMap = new Map<string, SubgraphNode>();
    const edgesMap = new Map<string, SubgraphEdge>();

    for (const record of result.records) {
      const node = record.get('n');
      const labels = record.get('labels') as string[];
      const rels = record.get('rels') || [];

      if (node && node.properties.id) {
        nodesMap.set(node.properties.id, {
          id: node.properties.id,
          type: labels[0] || 'Unknown',
          label: node.properties.name || node.properties.id,
          properties: this.extractProperties(node.properties),
          saliency: 0,
          embedding: node.properties.embedding,
        });
      }

      for (const rel of rels) {
        if (rel && rel.properties?.id) {
          edgesMap.set(rel.properties.id, {
            id: rel.properties.id,
            type: rel.type,
            sourceId: rel.start?.properties?.id,
            targetId: rel.end?.properties?.id,
            weight: rel.properties.weight,
          });
        }
      }
    }

    return {
      nodes: Array.from(nodesMap.values()),
      edges: Array.from(edgesMap.values()).filter(
        (e) => e.sourceId && e.targetId,
      ),
    };
  }

  /**
   * Compute saliency scores using graph centrality metrics
   */
  private async computeSaliency(
    session: Session,
    subgraph: { nodes: SubgraphNode[]; edges: SubgraphEdge[] },
  ): Promise<{ nodes: SubgraphNode[]; edges: SubgraphEdge[] }> {
    if (subgraph.nodes.length === 0) {
      return subgraph;
    }

    const nodeIds = subgraph.nodes.map((n) => n.id);

    // Compute PageRank for the subgraph
    let pageRankScores = new Map<string, number>();
    let betweennessScores = new Map<string, number>();

    try {
      // Project subgraph to GDS
      await session.run(
        `
        CALL gds.graph.project.cypher(
          'ragSubgraph',
          'MATCH (n) WHERE n.id IN $nodeIds RETURN id(n) AS id, n.id AS nodeId',
          'MATCH (a)-[r]->(b) WHERE a.id IN $nodeIds AND b.id IN $nodeIds
           RETURN id(a) AS source, id(b) AS target',
          { parameters: { nodeIds: $nodeIds } }
        )
        `,
        { nodeIds },
      );

      // PageRank
      if (this.config.usePageRank) {
        const prResult = await session.run(`
          CALL gds.pageRank.stream('ragSubgraph')
          YIELD nodeId, score
          MATCH (n) WHERE id(n) = nodeId
          RETURN n.id AS id, score
        `);

        for (const record of prResult.records) {
          pageRankScores.set(record.get('id'), record.get('score'));
        }
      }

      // Betweenness Centrality
      if (this.config.useBetweenness) {
        const bcResult = await session.run(`
          CALL gds.betweenness.stream('ragSubgraph')
          YIELD nodeId, score
          MATCH (n) WHERE id(n) = nodeId
          RETURN n.id AS id, score
        `);

        for (const record of bcResult.records) {
          betweennessScores.set(record.get('id'), record.get('score'));
        }
      }

      // Clean up
      await session.run(`CALL gds.graph.drop('ragSubgraph', false)`);
    } catch (error) {
      // GDS might not be available, use fallback scoring
      console.warn('GDS not available, using fallback saliency scoring');
    }

    // Normalize and combine scores
    const maxPR = Math.max(...pageRankScores.values(), 1);
    const maxBC = Math.max(...betweennessScores.values(), 1);

    const scoredNodes = subgraph.nodes.map((node) => {
      const prScore = (pageRankScores.get(node.id) || 0) / maxPR;
      const bcScore = (betweennessScores.get(node.id) || 0) / maxBC;

      // Combined saliency: weighted average
      const saliency = 0.6 * prScore + 0.4 * bcScore;

      return {
        ...node,
        saliency: Math.max(saliency, 0.1), // Minimum saliency
      };
    });

    return {
      nodes: scoredNodes,
      edges: subgraph.edges,
    };
  }

  /**
   * Extract evidence paths from subgraph
   */
  private async extractEvidencePaths(
    session: Session,
    seedEntities: string[],
    subgraph: { nodes: SubgraphNode[]; edges: SubgraphEdge[] },
    query: RetrievalQuery,
  ): Promise<GraphPath[]> {
    const paths: GraphPath[] = [];

    // Find shortest paths between high-saliency nodes
    const highSaliencyNodes = subgraph.nodes
      .filter((n) => n.saliency > 0.5)
      .slice(0, 20);

    for (let i = 0; i < seedEntities.length; i++) {
      for (const targetNode of highSaliencyNodes) {
        if (seedEntities[i] === targetNode.id) continue;

        const result = await session.run(
          `
          MATCH (source {id: $sourceId}), (target {id: $targetId})
          MATCH path = shortestPath((source)-[*..${query.maxHops}]-(target))
          RETURN nodes(path) as nodes, relationships(path) as rels
          LIMIT 1
          `,
          {
            sourceId: seedEntities[i],
            targetId: targetNode.id,
          },
        );

        if (result.records.length > 0) {
          const record = result.records[0];
          const pathNodes = record.get('nodes');
          const pathRels = record.get('rels');

          const graphPath: GraphPath = {
            id: uuidv4(),
            nodes: pathNodes.map((n: any) => ({
              id: n.properties.id,
              type: n.labels?.[0] || 'Unknown',
              label: n.properties.name || n.properties.id,
              properties: this.extractProperties(n.properties),
            })),
            edges: pathRels.map((r: any) => ({
              id: r.properties?.id || uuidv4(),
              type: r.type,
              sourceId: r.start?.properties?.id,
              targetId: r.end?.properties?.id,
              properties: this.extractProperties(r.properties || {}),
            })),
            pathLength: pathRels.length,
            confidence: this.calculatePathConfidence(pathNodes, pathRels),
            saliencyScore: targetNode.saliency,
          };

          paths.push(graphPath);
        }
      }
    }

    // Sort by saliency and limit
    return paths.sort((a, b) => b.saliencyScore - a.saliencyScore).slice(0, 10);
  }

  /**
   * Build evidence chunks from subgraph and paths
   */
  private async buildEvidenceChunks(
    session: Session,
    subgraph: { nodes: SubgraphNode[]; edges: SubgraphEdge[] },
    graphPaths: GraphPath[],
    query: RetrievalQuery,
  ): Promise<EvidenceChunk[]> {
    const chunks: EvidenceChunk[] = [];

    // Create evidence chunks from high-saliency nodes
    const sortedNodes = subgraph.nodes
      .filter((n) => n.saliency >= query.minRelevance)
      .sort((a, b) => b.saliency - a.saliency)
      .slice(0, 50);

    for (const node of sortedNodes) {
      // Find paths involving this node
      const relevantPaths = graphPaths.filter(
        (p) => p.nodes.some((n) => n.id === node.id),
      );

      // Build content summary
      const content = this.buildNodeSummary(node, relevantPaths);

      // Create citations for the node
      const citations: CitationSource[] = [];

      // Check for linked documents
      const docResult = await session.run(
        `
        MATCH (n {id: $nodeId})-[:SOURCES_FROM|MENTIONED_IN]-(d:Document)
        RETURN d.id as docId, d.title as title, d.content as content
        LIMIT 5
        `,
        { nodeId: node.id },
      );

      for (const record of docResult.records) {
        citations.push({
          id: uuidv4(),
          documentId: record.get('docId'),
          documentTitle: record.get('title'),
          spanStart: 0,
          spanEnd: Math.min(record.get('content')?.length || 0, 500),
          content: record.get('content')?.substring(0, 500) || '',
          confidence: node.saliency,
          sourceType: 'document',
        });
      }

      // Add graph citation
      citations.push({
        id: uuidv4(),
        documentId: `graph:${node.id}`,
        spanStart: 0,
        spanEnd: content.length,
        content: content,
        confidence: node.saliency,
        sourceType: 'graph',
        metadata: {
          nodeType: node.type,
          properties: node.properties,
        },
      });

      chunks.push({
        id: uuidv4(),
        content,
        citations,
        graphPaths: relevantPaths,
        relevanceScore: node.saliency,
        tenantId: query.tenantId,
      });
    }

    return chunks;
  }

  /**
   * Build a summary of a node for evidence
   */
  private buildNodeSummary(node: SubgraphNode, paths: GraphPath[]): string {
    let summary = `${node.type}: ${node.label}`;

    const props = Object.entries(node.properties)
      .filter(([key]) => !['id', 'embedding', 'tenantId'].includes(key))
      .slice(0, 5);

    if (props.length > 0) {
      summary += '\nProperties: ' + props.map(([k, v]) => `${k}=${v}`).join(', ');
    }

    if (paths.length > 0) {
      summary += '\nConnections:';
      for (const path of paths.slice(0, 3)) {
        const pathDesc = path.nodes.map((n) => n.label).join(' → ');
        summary += `\n  - ${pathDesc}`;
      }
    }

    return summary;
  }

  /**
   * Calculate confidence for a path based on node/edge confidences
   */
  private calculatePathConfidence(nodes: any[], rels: any[]): number {
    const nodeConfidences = nodes.map(
      (n) => n.properties?.confidence ?? 0.8,
    );
    const relConfidences = rels.map((r) => r.properties?.confidence ?? 0.8);

    const allConfidences = [...nodeConfidences, ...relConfidences];
    if (allConfidences.length === 0) return 0.5;

    // Geometric mean for combined confidence
    const product = allConfidences.reduce((a, b) => a * b, 1);
    return Math.pow(product, 1 / allConfidences.length);
  }

  /**
   * Extract safe properties from node/relationship
   */
  private extractProperties(props: Record<string, any>): Record<string, any> {
    const safe: Record<string, any> = {};
    const exclude = ['embedding', 'password', 'secret', 'token'];

    for (const [key, value] of Object.entries(props)) {
      if (!exclude.includes(key.toLowerCase())) {
        // Handle Neo4j integer type
        if (value && typeof value === 'object' && 'low' in value) {
          safe[key] = value.low;
        } else if (typeof value !== 'function') {
          safe[key] = value;
        }
      }
    }

    return safe;
  }

  /**
   * Return empty result
   */
  private emptyResult(query: RetrievalQuery, startTime: number): RetrievalResult {
    return {
      id: uuidv4(),
      query: query.query,
      evidenceChunks: [],
      subgraph: { nodes: [], edges: [] },
      totalDocumentsSearched: 0,
      totalNodesTraversed: 0,
      processingTimeMs: Date.now() - startTime,
    };
  }
}
