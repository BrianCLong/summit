import { Driver } from 'neo4j-driver';
import { Pool } from 'pg';
import { RedisClientType } from 'redis';
import { logger } from '../utils/logger';
import {
  Graph,
  PathResult,
  PathQueryConstraints,
  NodePolicyFilter,
  EdgePolicyFilter,
  CommunityAnalysisResult,
  CentralityAnalysisResult,
  PatternAnalysisResult,
  PatternMinerParams,
  SubgraphQuery,
} from '../types/analytics';
import { Neo4jGraphRepository } from '../repositories/GraphRepository';
import {
  shortestPath,
  kShortestPaths,
} from '../algorithms/pathfinding';
import { computeCentrality } from '../algorithms/centrality';
import { detectCommunities } from '../algorithms/community';
import { runPatternMiner } from '../algorithms/patterns';
import {
  explainPathAnalysis,
  explainCommunityAnalysis,
  explainCentralityAnalysis,
  explainPatternAnalysis,
} from '../algorithms/explainability';

/**
 * Enhanced Graph Analytics Service
 *
 * Provides comprehensive graph analytics with:
 * - K-shortest paths with policy filtering
 * - Community detection (Louvain/Label Propagation)
 * - Centrality metrics (degree, betweenness, eigenvector)
 * - Pattern/motif detection (star, bipartite, repeated interactions)
 * - Explainability for all results
 */
export class EnhancedGraphAnalyticsService {
  private graphRepository: Neo4jGraphRepository;

  constructor(
    private neo4jDriver: Driver,
    private pgPool: Pool,
    private redisClient: RedisClientType,
  ) {
    this.graphRepository = new Neo4jGraphRepository(neo4jDriver);
  }

  /**
   * Analyze paths between two nodes with K-shortest paths and policy filtering
   */
  async analyzePaths(input: {
    startNodeId: string;
    endNodeId: string;
    k?: number;
    constraints?: PathQueryConstraints;
    nodePolicyFilter?: NodePolicyFilter;
    edgePolicyFilter?: EdgePolicyFilter;
  }): Promise<PathResult> {
    const startTime = Date.now();
    const k = input.k || 1;

    logger.info('Analyzing paths', {
      start: input.startNodeId,
      end: input.endNodeId,
      k,
    });

    try {
      // Fetch subgraph around source and target nodes
      const graph = await this.fetchPathSubgraph(
        input.startNodeId,
        input.endNodeId,
        input.constraints,
      );

      // Find K-shortest paths
      const { paths, filteredNodesCount, filteredEdgesCount } =
        kShortestPaths(
          graph,
          input.startNodeId,
          input.endNodeId,
          k,
          input.constraints,
          input.nodePolicyFilter,
          input.edgePolicyFilter,
        );

      // Calculate statistics
      const lengths = paths.map((p) => p.length);
      const stats = {
        totalPaths: paths.length,
        averageLength: lengths.length > 0
          ? lengths.reduce((sum, l) => sum + l, 0) / lengths.length
          : 0,
        minLength: lengths.length > 0 ? Math.min(...lengths) : 0,
        maxLength: lengths.length > 0 ? Math.max(...lengths) : 0,
        policyFilteredNodes: filteredNodesCount,
        policyFilteredEdges: filteredEdgesCount,
      };

      // Generate explanation
      const explanation = explainPathAnalysis(
        input.startNodeId,
        input.endNodeId,
        paths,
        stats,
      );

      const result: PathResult = {
        source: input.startNodeId,
        target: input.endNodeId,
        paths,
        shortestPath: paths.length > 0 ? paths[0] : undefined,
        explanation,
        stats,
      };

      // Cache result
      await this.cacheResult(
        `paths:${input.startNodeId}:${input.endNodeId}:${k}`,
        result,
        3600,
      );

      logger.info('Path analysis completed', {
        elapsed: `${Date.now() - startTime}ms`,
        pathsFound: paths.length,
      });

      return result;
    } catch (error) {
      logger.error('Error analyzing paths:', error);
      throw error;
    }
  }

  /**
   * Analyze community structure in a subgraph
   */
  async analyzeCommunities(input: {
    nodeIds?: string[];
    depth?: number;
    limit?: number;
    algorithm?: 'louvain' | 'label_propagation';
  }): Promise<CommunityAnalysisResult> {
    const startTime = Date.now();
    const algorithm = input.algorithm || 'louvain';

    logger.info('Analyzing communities', {
      nodeIds: input.nodeIds?.length || 'all',
      algorithm,
    });

    try {
      // Fetch subgraph
      const graph = await this.graphRepository.getSubgraph({
        nodeIds: input.nodeIds,
        depth: input.depth || 2,
        limit: input.limit || 1000,
      });

      // Detect communities
      const communities = detectCommunities(graph, algorithm);

      // Generate explanation
      const explanation = explainCommunityAnalysis(communities, algorithm);

      const result: CommunityAnalysisResult = {
        communities,
        explanation,
        algorithm,
        parameters: {
          depth: input.depth || 2,
          limit: input.limit || 1000,
        },
      };

      // Cache result
      await this.cacheResult(
        `communities:${input.nodeIds?.join(',') || 'all'}:${algorithm}`,
        result,
        3600,
      );

      logger.info('Community analysis completed', {
        elapsed: `${Date.now() - startTime}ms`,
        communities: communities.numCommunities,
      });

      return result;
    } catch (error) {
      logger.error('Error analyzing communities:', error);
      throw error;
    }
  }

  /**
   * Analyze centrality metrics for a subgraph
   */
  async analyzeCentrality(input: {
    nodeIds?: string[];
    depth?: number;
    includeEigenvector?: boolean;
    includeCloseness?: boolean;
  }): Promise<CentralityAnalysisResult> {
    const startTime = Date.now();

    logger.info('Analyzing centrality', {
      nodeIds: input.nodeIds?.length || 'all',
      includeEigenvector: input.includeEigenvector,
    });

    try {
      // Fetch subgraph
      const graph = await this.graphRepository.getSubgraph({
        nodeIds: input.nodeIds,
        depth: input.depth || 2,
        limit: 1000,
      });

      // Compute centrality
      const centrality = computeCentrality(graph, {
        includeEigenvector: input.includeEigenvector,
        includeCloseness: input.includeCloseness,
        topN: 10,
      });

      // Generate explanation
      const explanation = explainCentralityAnalysis(
        centrality,
        'degree, betweenness' +
          (input.includeEigenvector ? ', eigenvector' : '') +
          (input.includeCloseness ? ', closeness' : ''),
      );

      const result: CentralityAnalysisResult = {
        centrality,
        explanation,
        algorithm:
          'degree, betweenness' +
          (input.includeEigenvector ? ', eigenvector' : ''),
      };

      // Cache result
      await this.cacheResult(
        `centrality:${input.nodeIds?.join(',') || 'all'}`,
        result,
        3600,
      );

      logger.info('Centrality analysis completed', {
        elapsed: `${Date.now() - startTime}ms`,
        nodes: graph.nodes.length,
      });

      return result;
    } catch (error) {
      logger.error('Error analyzing centrality:', error);
      throw error;
    }
  }

  /**
   * Analyze patterns/motifs in a subgraph
   */
  async analyzePatterns(input: {
    nodeIds?: string[];
    depth?: number;
    patternParams: PatternMinerParams;
  }): Promise<PatternAnalysisResult> {
    const startTime = Date.now();

    logger.info('Analyzing patterns', {
      nodeIds: input.nodeIds?.length || 'all',
      patterns: Object.keys(input.patternParams),
    });

    try {
      // Fetch subgraph
      const graph = await this.graphRepository.getSubgraph({
        nodeIds: input.nodeIds,
        depth: input.depth || 3,
        limit: 2000, // Allow larger graphs for pattern detection
      });

      // Run pattern miner
      const { patterns } = runPatternMiner(graph, input.patternParams);

      // Calculate stats
      const byType = patterns.reduce(
        (acc, p) => {
          acc[p.patternType] = (acc[p.patternType] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      // Generate explanation
      const explanation = explainPatternAnalysis(patterns);

      const result: PatternAnalysisResult = {
        patterns,
        explanation,
        stats: {
          totalPatterns: patterns.length,
          byType,
        },
      };

      // Cache result
      await this.cacheResult(
        `patterns:${input.nodeIds?.join(',') || 'all'}`,
        result,
        3600,
      );

      logger.info('Pattern analysis completed', {
        elapsed: `${Date.now() - startTime}ms`,
        patternsFound: patterns.length,
      });

      return result;
    } catch (error) {
      logger.error('Error analyzing patterns:', error);
      throw error;
    }
  }

  /**
   * Run comprehensive analysis (all analytics)
   */
  async analyzeComprehensive(input: {
    nodeIds?: string[];
    depth?: number;
    includeEigenvector?: boolean;
    patternParams?: PatternMinerParams;
  }): Promise<{
    communities: CommunityAnalysisResult;
    centrality: CentralityAnalysisResult;
    patterns?: PatternAnalysisResult;
  }> {
    logger.info('Running comprehensive analysis');

    const [communities, centrality, patterns] = await Promise.all([
      this.analyzeCommunities({
        nodeIds: input.nodeIds,
        depth: input.depth,
      }),
      this.analyzeCentrality({
        nodeIds: input.nodeIds,
        depth: input.depth,
        includeEigenvector: input.includeEigenvector,
      }),
      input.patternParams
        ? this.analyzePatterns({
            nodeIds: input.nodeIds,
            depth: input.depth,
            patternParams: input.patternParams,
          })
        : Promise.resolve(undefined),
    ]);

    return {
      communities,
      centrality,
      patterns,
    };
  }

  /**
   * Helper: Fetch subgraph optimized for path finding
   */
  private async fetchPathSubgraph(
    startNodeId: string,
    endNodeId: string,
    constraints?: PathQueryConstraints,
  ): Promise<Graph> {
    const maxDepth = constraints?.maxDepth || 6;

    // Fetch neighborhoods around both nodes
    const [startNeighborhood, endNeighborhood] = await Promise.all([
      this.graphRepository.getNeighbors(startNodeId, Math.ceil(maxDepth / 2), {
        edgeTypes: constraints?.requiredEdgeTypes,
      }),
      this.graphRepository.getNeighbors(endNodeId, Math.ceil(maxDepth / 2), {
        edgeTypes: constraints?.requiredEdgeTypes,
      }),
    ]);

    // Merge neighborhoods
    const nodeMap = new Map<string, any>();
    const edgeMap = new Map<string, any>();

    for (const node of [...startNeighborhood.nodes, ...endNeighborhood.nodes]) {
      nodeMap.set(node.id, node);
    }

    for (const edge of [...startNeighborhood.edges, ...endNeighborhood.edges]) {
      edgeMap.set(edge.id, edge);
    }

    return {
      nodes: Array.from(nodeMap.values()),
      edges: Array.from(edgeMap.values()),
    };
  }

  /**
   * Cache analysis result
   */
  private async cacheResult(
    key: string,
    data: any,
    ttl: number,
  ): Promise<void> {
    try {
      await this.redisClient.setEx(
        `graph-analytics:enhanced:${key}`,
        ttl,
        JSON.stringify(data),
      );
    } catch (error) {
      logger.warn('Failed to cache result:', error);
    }
  }

  /**
   * Get cached result
   */
  private async getCachedResult(key: string): Promise<any> {
    try {
      const cached = await this.redisClient.get(
        `graph-analytics:enhanced:${key}`,
      );
      return cached ? JSON.parse(cached as string) : null;
    } catch (error) {
      logger.warn('Failed to get cached result:', error);
      return null;
    }
  }
}
