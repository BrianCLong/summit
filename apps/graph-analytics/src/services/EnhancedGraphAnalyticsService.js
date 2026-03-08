"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedGraphAnalyticsService = void 0;
const logger_1 = require("../utils/logger");
const GraphRepository_1 = require("../repositories/GraphRepository");
const pathfinding_1 = require("../algorithms/pathfinding");
const centrality_1 = require("../algorithms/centrality");
const community_1 = require("../algorithms/community");
const patterns_1 = require("../algorithms/patterns");
const explainability_1 = require("../algorithms/explainability");
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
class EnhancedGraphAnalyticsService {
    neo4jDriver;
    pgPool;
    redisClient;
    graphRepository;
    constructor(neo4jDriver, pgPool, redisClient) {
        this.neo4jDriver = neo4jDriver;
        this.pgPool = pgPool;
        this.redisClient = redisClient;
        this.graphRepository = new GraphRepository_1.Neo4jGraphRepository(neo4jDriver);
    }
    /**
     * Analyze paths between two nodes with K-shortest paths and policy filtering
     */
    async analyzePaths(input) {
        const startTime = Date.now();
        const k = input.k || 1;
        logger_1.logger.info('Analyzing paths', {
            start: input.startNodeId,
            end: input.endNodeId,
            k,
        });
        try {
            // Fetch subgraph around source and target nodes
            const graph = await this.fetchPathSubgraph(input.startNodeId, input.endNodeId, input.constraints);
            // Find K-shortest paths
            const { paths, filteredNodesCount, filteredEdgesCount } = (0, pathfinding_1.kShortestPaths)(graph, input.startNodeId, input.endNodeId, k, input.constraints, input.nodePolicyFilter, input.edgePolicyFilter);
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
            const explanation = (0, explainability_1.explainPathAnalysis)(input.startNodeId, input.endNodeId, paths, stats);
            const result = {
                source: input.startNodeId,
                target: input.endNodeId,
                paths,
                shortestPath: paths.length > 0 ? paths[0] : undefined,
                explanation,
                stats,
            };
            // Cache result
            await this.cacheResult(`paths:${input.startNodeId}:${input.endNodeId}:${k}`, result, 3600);
            logger_1.logger.info('Path analysis completed', {
                elapsed: `${Date.now() - startTime}ms`,
                pathsFound: paths.length,
            });
            return result;
        }
        catch (error) {
            logger_1.logger.error('Error analyzing paths:', error);
            throw error;
        }
    }
    /**
     * Analyze community structure in a subgraph
     */
    async analyzeCommunities(input) {
        const startTime = Date.now();
        const algorithm = input.algorithm || 'louvain';
        logger_1.logger.info('Analyzing communities', {
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
            const communities = (0, community_1.detectCommunities)(graph, algorithm);
            // Generate explanation
            const explanation = (0, explainability_1.explainCommunityAnalysis)(communities, algorithm);
            const result = {
                communities,
                explanation,
                algorithm,
                parameters: {
                    depth: input.depth || 2,
                    limit: input.limit || 1000,
                },
            };
            // Cache result
            await this.cacheResult(`communities:${input.nodeIds?.join(',') || 'all'}:${algorithm}`, result, 3600);
            logger_1.logger.info('Community analysis completed', {
                elapsed: `${Date.now() - startTime}ms`,
                communities: communities.numCommunities,
            });
            return result;
        }
        catch (error) {
            logger_1.logger.error('Error analyzing communities:', error);
            throw error;
        }
    }
    /**
     * Analyze centrality metrics for a subgraph
     */
    async analyzeCentrality(input) {
        const startTime = Date.now();
        logger_1.logger.info('Analyzing centrality', {
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
            const centrality = (0, centrality_1.computeCentrality)(graph, {
                includeEigenvector: input.includeEigenvector,
                includeCloseness: input.includeCloseness,
                topN: 10,
            });
            // Generate explanation
            const explanation = (0, explainability_1.explainCentralityAnalysis)(centrality, 'degree, betweenness' +
                (input.includeEigenvector ? ', eigenvector' : '') +
                (input.includeCloseness ? ', closeness' : ''));
            const result = {
                centrality,
                explanation,
                algorithm: 'degree, betweenness' +
                    (input.includeEigenvector ? ', eigenvector' : ''),
            };
            // Cache result
            await this.cacheResult(`centrality:${input.nodeIds?.join(',') || 'all'}`, result, 3600);
            logger_1.logger.info('Centrality analysis completed', {
                elapsed: `${Date.now() - startTime}ms`,
                nodes: graph.nodes.length,
            });
            return result;
        }
        catch (error) {
            logger_1.logger.error('Error analyzing centrality:', error);
            throw error;
        }
    }
    /**
     * Analyze patterns/motifs in a subgraph
     */
    async analyzePatterns(input) {
        const startTime = Date.now();
        logger_1.logger.info('Analyzing patterns', {
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
            const { patterns } = (0, patterns_1.runPatternMiner)(graph, input.patternParams);
            // Calculate stats
            const byType = patterns.reduce((acc, p) => {
                acc[p.patternType] = (acc[p.patternType] || 0) + 1;
                return acc;
            }, {});
            // Generate explanation
            const explanation = (0, explainability_1.explainPatternAnalysis)(patterns);
            const result = {
                patterns,
                explanation,
                stats: {
                    totalPatterns: patterns.length,
                    byType,
                },
            };
            // Cache result
            await this.cacheResult(`patterns:${input.nodeIds?.join(',') || 'all'}`, result, 3600);
            logger_1.logger.info('Pattern analysis completed', {
                elapsed: `${Date.now() - startTime}ms`,
                patternsFound: patterns.length,
            });
            return result;
        }
        catch (error) {
            logger_1.logger.error('Error analyzing patterns:', error);
            throw error;
        }
    }
    /**
     * Run comprehensive analysis (all analytics)
     */
    async analyzeComprehensive(input) {
        logger_1.logger.info('Running comprehensive analysis');
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
    async fetchPathSubgraph(startNodeId, endNodeId, constraints) {
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
        const nodeMap = new Map();
        const edgeMap = new Map();
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
    async cacheResult(key, data, ttl) {
        try {
            await this.redisClient.setEx(`graph-analytics:enhanced:${key}`, ttl, JSON.stringify(data));
        }
        catch (error) {
            logger_1.logger.warn('Failed to cache result:', error);
        }
    }
    /**
     * Get cached result
     */
    async getCachedResult(key) {
        try {
            const cached = await this.redisClient.get(`graph-analytics:enhanced:${key}`);
            return cached ? JSON.parse(cached) : null;
        }
        catch (error) {
            logger_1.logger.warn('Failed to get cached result:', error);
            return null;
        }
    }
}
exports.EnhancedGraphAnalyticsService = EnhancedGraphAnalyticsService;
