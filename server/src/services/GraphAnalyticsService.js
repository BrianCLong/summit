const crypto = require('crypto');
const neo4j = require('neo4j-driver');

const { getNeo4jDriver, getRedisClient } = require('../config/database');
const logger = require('../utils/logger');

const DEFAULT_PAGE_RANK_LIMIT = 100;
const DEFAULT_COMMUNITY_LIMIT = 25;
const NODE_PROJECTION_QUERY = `
  MATCH (n:Entity)
  WHERE $investigationId IS NULL OR n.investigation_id = $investigationId
  RETURN id(n) AS id, labels(n) AS labels, { id: n.id, label: n.label } AS properties
`;

const RELATIONSHIP_PROJECTION_QUERY = `
  MATCH (source:Entity)-[r]->(target:Entity)
  WHERE $investigationId IS NULL OR (source.investigation_id = $investigationId AND target.investigation_id = $investigationId)
  RETURN id(source) AS source, id(target) AS target, type(r) AS type
`;

const toNumber = (value) => (neo4j.isInt(value) ? value.toNumber() : value);

class GraphAnalyticsService {
  constructor({ driver, redis, cacheTtl, graphNamespace } = {}) {
    this.logger = logger;
    this.driver = driver || null;
    this.redis = typeof redis === 'undefined' ? null : redis;
    this.cacheTtl = cacheTtl ?? Number(process.env.GRAPH_ANALYTICS_CACHE_TTL || 300);
    this.graphNamespace = graphNamespace || process.env.GRAPH_ANALYTICS_GRAPH_NAMESPACE || 'summit_analytics';
    this.maxConcurrency = Number(process.env.GRAPH_ANALYTICS_MAX_CONCURRENCY || 8);
    this.projectionBatchSize = Number(process.env.GRAPH_ANALYTICS_PROJECT_BATCH_SIZE || 100000);

    if (!this.driver) {
      try {
        this.driver = getNeo4jDriver();
      } catch (error) {
        this.logger.error('Neo4j driver unavailable during GraphAnalyticsService construction', error);
      }
    }

    if (typeof redis === 'undefined') {
      try {
        this.redis = getRedisClient();
      } catch (error) {
        this.logger.warn('Redis client unavailable for GraphAnalyticsService cache usage', error);
        this.redis = null;
      }
    }
  }

  getDriver() {
    if (!this.driver) {
      this.driver = getNeo4jDriver();
    }
    return this.driver;
  }

  getRedis() {
    if (typeof this.redis === 'undefined' || this.redis === null) {
      try {
        this.redis = getRedisClient();
      } catch (error) {
        this.logger.warn('Unable to acquire Redis client for Graph Analytics caching', error);
        this.redis = null;
      }
    }
    return this.redis;
  }

  async withSession(accessMode, work) {
    const driver = this.getDriver();
    const session = driver.session({ defaultAccessMode: accessMode });
    try {
      return await work(session);
    } finally {
      await session.close();
    }
  }

  getGraphName(investigationId) {
    if (!investigationId) {
      return `${this.graphNamespace}_global`;
    }

    const hash = crypto.createHash('sha1').update(String(investigationId)).digest('hex');
    return `${this.graphNamespace}_${hash}`;
  }

  normalizeForCache(value) {
    if (Array.isArray(value)) {
      return value.map((entry) => this.normalizeForCache(entry));
    }

    if (value && typeof value === 'object') {
      return Object.keys(value)
        .filter((key) => value[key] !== undefined)
        .sort()
        .reduce((acc, key) => {
          acc[key] = this.normalizeForCache(value[key]);
          return acc;
        }, {});
    }

    return value;
  }

  createCacheKey(prefix, options) {
    const normalized = this.normalizeForCache(options);
    const hash = crypto.createHash('sha1').update(JSON.stringify(normalized)).digest('hex');
    return `${this.graphNamespace}:${prefix}:${hash}`;
  }

  async runWithCache(prefix, options, computeFn, { forceRefresh = false, ttl } = {}) {
    const redis = this.getRedis();
    const cacheKey = this.createCacheKey(prefix, options);
    const effectiveTtl = typeof ttl === 'number' ? ttl : this.cacheTtl;

    if (redis && forceRefresh) {
      try {
        await redis.del(cacheKey);
      } catch (error) {
        this.logger.warn('Failed to evict Graph Analytics cache key', { cacheKey, error });
      }
    }

    if (redis && !forceRefresh) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        this.logger.warn('Failed to read Graph Analytics cache key', { cacheKey, error });
      }
    }

    const result = await computeFn();

    if (redis && effectiveTtl > 0) {
      try {
        await redis.set(cacheKey, JSON.stringify(result), 'EX', effectiveTtl);
      } catch (error) {
        this.logger.warn('Failed to store Graph Analytics cache entry', { cacheKey, error });
      }
    }

    return result;
  }

  async dropGraphProjection(graphName) {
    return this.withSession(neo4j.session.WRITE, async (session) => {
      try {
        await session.run(
          `CALL gds.graph.drop($graphName, false) YIELD graphName RETURN graphName`,
          { graphName },
        );
      } catch (error) {
        if (!String(error?.message || '').includes('does not exist')) {
          this.logger.warn('Failed to drop GDS graph projection', { graphName, error });
        }
      }
    });
  }

  async graphExists(session, graphName) {
    const result = await session.run(
      `CALL gds.graph.exists($graphName) YIELD exists RETURN exists`,
      { graphName },
    );
    const record = result.records[0];
    return record ? Boolean(record.get('exists')) : false;
  }

  async ensureGraphProjection(graphName, { investigationId }) {
    return this.withSession(neo4j.session.WRITE, async (session) => {
      const exists = await this.graphExists(session, graphName);
      if (exists) {
        return;
      }

      await session.run(
        `CALL gds.graph.project.cypher(
          $graphName,
          $nodeQuery,
          $relationshipQuery,
          {
            parameters: $parameters,
            validateRelationships: false,
            batchSize: $batchSize
          }
        ) YIELD graphName RETURN graphName`,
        {
          graphName,
          nodeQuery: NODE_PROJECTION_QUERY,
          relationshipQuery: RELATIONSHIP_PROJECTION_QUERY,
          parameters: { investigationId: investigationId || null },
          batchSize: this.projectionBatchSize,
        },
      );
    });
  }

  /**
   * Calculate basic graph metrics
   */
  async calculateBasicMetrics(investigationId = null) {
    const session = this.getDriver().session();

    try {
      const constraints = investigationId
        ? 'WHERE n.investigation_id = $investigationId AND m.investigation_id = $investigationId'
        : '';

      const params = investigationId ? { investigationId } : {};

      const query = `
        MATCH (n)
        ${constraints.replace('m.investigation_id', 'n.investigation_id')}
        WITH count(n) as nodeCount
        MATCH ()-[r]->()
        ${constraints.replace('n.investigation_id', 'r.investigation_id')}
        WITH nodeCount, count(r) as edgeCount
        MATCH (n)-[r]->()
        ${constraints.replace('m.investigation_id', 'n.investigation_id')}
        WITH nodeCount, edgeCount, n.id as nodeId, count(r) as degree
        RETURN 
          nodeCount,
          edgeCount,
          avg(degree) as avgDegree,
          max(degree) as maxDegree,
          min(degree) as minDegree,
          stdev(degree) as degreeStdDev
      `;

      const result = await session.run(query, params);

      if (result.records.length === 0) {
        return {
          nodeCount: 0,
          edgeCount: 0,
          avgDegree: 0,
          maxDegree: 0,
          minDegree: 0,
          degreeStdDev: 0,
          density: 0,
        };
      }

      const record = result.records[0];
      const nodeCount = record.get('nodeCount').toNumber();
      const edgeCount = record.get('edgeCount').toNumber();
      const avgDegree = record.get('avgDegree') || 0;
      const maxDegree = record.get('maxDegree').toNumber();
      const minDegree = record.get('minDegree').toNumber();
      const degreeStdDev = record.get('degreeStdDev') || 0;

      // Calculate graph density
      const maxPossibleEdges = nodeCount * (nodeCount - 1);
      const density = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;

      return {
        nodeCount,
        edgeCount,
        avgDegree,
        maxDegree,
        minDegree,
        degreeStdDev,
        density,
      };
    } catch (error) {
      this.logger.error('Error calculating basic metrics:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Calculate centrality measures
   */
  async calculateCentralityMeasures(investigationId = null, limit = 50) {
    const session = this.getDriver().session();

    try {
      const constraints = investigationId ? 'WHERE n.investigation_id = $investigationId' : '';

      const params = investigationId ? { investigationId, limit } : { limit };

      // Degree Centrality
      const degreeQuery = `
        MATCH (n)
        ${constraints}
        OPTIONAL MATCH (n)-[r]-()
        WITH n, count(r) as degree
        RETURN n.id as nodeId, n.label as label, degree
        ORDER BY degree DESC
        LIMIT $limit
      `;

      // Betweenness Centrality (approximation)
      const betweennessQuery = `
        MATCH (n)
        ${constraints}
        WITH n
        MATCH path = allShortestPaths((n)-[*]-(m))
        WHERE n <> m ${investigationId ? 'AND m.investigation_id = $investigationId' : ''}
        WITH n, length(path) as pathLength, count(path) as pathCount
        RETURN n.id as nodeId, n.label as label, 
               avg(pathLength) as avgPathLength,
               sum(pathCount) as totalPaths
        ORDER BY totalPaths DESC
        LIMIT $limit
      `;

      // Closeness Centrality
      const closenessQuery = `
        MATCH (n)
        ${constraints}
        WITH n
        MATCH path = shortestPath((n)-[*]-(m))
        WHERE n <> m ${investigationId ? 'AND m.investigation_id = $investigationId' : ''}
        WITH n, avg(length(path)) as avgDistance
        RETURN n.id as nodeId, n.label as label,
               CASE WHEN avgDistance > 0 THEN 1.0/avgDistance ELSE 0 END as closeness
        ORDER BY closeness DESC
        LIMIT $limit
      `;

      const [degreeResult, betweennessResult, closenessResult] = await Promise.all([
        session.run(degreeQuery, params),
        session.run(betweennessQuery, params),
        session.run(closenessQuery, params),
      ]);

      return {
        degreeCentrality: degreeResult.records.map((record) => ({
          nodeId: record.get('nodeId'),
          label: record.get('label'),
          score: record.get('degree').toNumber(),
        })),
        betweennessCentrality: betweennessResult.records.map((record) => ({
          nodeId: record.get('nodeId'),
          label: record.get('label'),
          avgPathLength: record.get('avgPathLength'),
          totalPaths: record.get('totalPaths').toNumber(),
        })),
        closenessCentrality: closenessResult.records.map((record) => ({
          nodeId: record.get('nodeId'),
          label: record.get('label'),
          score: record.get('closeness'),
        })),
      };
    } catch (error) {
      this.logger.error('Error calculating centrality measures:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Detect graph communities using the Neo4j GDS library with optional algorithm selection
   */
  async detectCommunities(...args) {
    const options = this.normalizeCommunityOptions(args);
    const graphName = this.getGraphName(options.investigationId);

    if (options.forceRefresh) {
      await this.dropGraphProjection(graphName);
    }

    const cacheOptions = {
      investigationId: options.investigationId || null,
      limit: options.limit,
      algorithm: options.algorithm,
      maxIterations: options.maxIterations,
      tolerance: options.tolerance,
      concurrency: options.concurrency,
    };

    return this.runWithCache(
      'communities',
      cacheOptions,
      async () => {
        await this.ensureGraphProjection(graphName, { investigationId: options.investigationId });
        return this.executeCommunityDetection({ ...options, graphName });
      },
      { forceRefresh: options.forceRefresh, ttl: options.cacheTtl },
    );
  }

  normalizeCommunityOptions(args) {
    let options = {};

    if (args.length === 0 || (args.length === 1 && typeof args[0] === 'undefined')) {
      options = {};
    } else if (typeof args[0] === 'object' && args[0] !== null) {
      options = args[0];
    } else {
      options = {
        investigationId: args[0] ?? null,
      };
    }

    const limit = Number(options.limit ?? DEFAULT_COMMUNITY_LIMIT);
    const algorithm = String(options.algorithm || 'LOUVAIN').toUpperCase();
    const normalized = {
      investigationId: options.investigationId ?? null,
      algorithm: ['LABEL_PROPAGATION', 'LOUVAIN'].includes(algorithm) ? algorithm : 'LOUVAIN',
      maxIterations: Number(options.maxIterations ?? 20),
      tolerance: Number(options.tolerance ?? 1e-4),
      limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : DEFAULT_COMMUNITY_LIMIT,
      cacheTtl: options.cacheTtl ?? undefined,
      concurrency: Number(options.concurrency ?? this.maxConcurrency),
      forceRefresh: Boolean(options.forceRefresh),
    };

    return normalized;
  }

  async executeCommunityDetection(options) {
    const params = {
      graphName: options.graphName,
      limit: options.limit,
      maxIterations: options.maxIterations,
      tolerance: options.tolerance,
      concurrency: Math.max(1, Math.min(options.concurrency, 64)),
    };

    const algorithmQuery = options.algorithm === 'LABEL_PROPAGATION'
      ? `CALL gds.labelPropagation.stream($graphName, {
          maxIterations: $maxIterations,
          tolerance: $tolerance,
          concurrency: $concurrency
        })`
      : `CALL gds.louvain.stream($graphName, {
          maxIterations: $maxIterations,
          tolerance: $tolerance,
          concurrency: $concurrency,
          includeIntermediateCommunities: false
        })`;

    const query = `
      ${algorithmQuery}
      YIELD nodeId, communityId
      WITH communityId, collect(gds.util.asNode(nodeId)) AS communityNodes
      WITH communityId,
           communityNodes,
           size(communityNodes) AS communitySize,
           [node IN communityNodes | { nodeId: node.id, label: coalesce(node.label, node.id) }] AS members
      RETURN communityId, communitySize, members
      ORDER BY communitySize DESC
      LIMIT $limit
    `;

    return this.withSession(neo4j.session.READ, async (session) => {
      const result = await session.run(query, params);
      return result.records.map((record) => {
        const communityId = toNumber(record.get('communityId'));
        const size = toNumber(record.get('communitySize'));
        const nodes = record.get('members') || [];
        return {
          id: communityId,
          communityId,
          size,
          algorithm: options.algorithm,
          nodes,
        };
      });
    });
  }

  /**
   * Find shortest paths between nodes
   */
  async findShortestPaths(sourceId, targetId, maxLength = 6) {
    const session = this.getDriver().session();

    try {
      const query = `
        MATCH (source {id: $sourceId}), (target {id: $targetId})
        MATCH path = allShortestPaths((source)-[*1..${maxLength}]-(target))
        RETURN path, length(path) as pathLength
        ORDER BY pathLength
        LIMIT 10
      `;

      const result = await session.run(query, { sourceId, targetId });

      return result.records.map((record) => {
        const path = record.get('path');
        const pathLength = record.get('pathLength').toNumber();

        return {
          length: pathLength,
          nodes: path.segments
            .map((segment) => ({
              id: segment.start.properties.id,
              label: segment.start.properties.label,
              type: segment.start.labels[0],
            }))
            .concat([
              {
                id: path.segments[path.segments.length - 1].end.properties.id,
                label: path.segments[path.segments.length - 1].end.properties.label,
                type: path.segments[path.segments.length - 1].end.labels[0],
              },
            ]),
          relationships: path.segments.map((segment) => ({
            type: segment.relationship.type,
            properties: segment.relationship.properties,
          })),
        };
      });
    } catch (error) {
      this.logger.error('Error finding shortest paths:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Analyze node importance using the Neo4j GDS PageRank implementation with Redis caching
   */
  async calculatePageRank(...args) {
    const options = this.normalizePageRankOptions(args);
    const graphName = this.getGraphName(options.investigationId);

    if (options.forceRefresh) {
      await this.dropGraphProjection(graphName);
    }

    const cacheOptions = {
      investigationId: options.investigationId || null,
      limit: options.limit,
      dampingFactor: options.dampingFactor,
      maxIterations: options.maxIterations,
      concurrency: options.concurrency,
    };

    return this.runWithCache(
      'pagerank',
      cacheOptions,
      async () => {
        await this.ensureGraphProjection(graphName, { investigationId: options.investigationId });
        return this.executePageRank({ ...options, graphName });
      },
      { forceRefresh: options.forceRefresh, ttl: options.cacheTtl },
    );
  }

  normalizePageRankOptions(args) {
    let options = {};

    if (args.length === 0 || (args.length === 1 && typeof args[0] === 'undefined')) {
      options = {};
    } else if (typeof args[0] === 'object' && args[0] !== null) {
      options = args[0];
    } else {
      options = {
        investigationId: args[0] ?? null,
        maxIterations: args[1] ?? args[0]?.maxIterations ?? 20,
        dampingFactor: args[2] ?? args[0]?.dampingFactor ?? 0.85,
      };
    }

    const limit = Number(options.limit ?? DEFAULT_PAGE_RANK_LIMIT);
    const normalized = {
      investigationId: options.investigationId ?? null,
      maxIterations: Number(options.maxIterations ?? 20),
      dampingFactor: Number(options.dampingFactor ?? 0.85),
      limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 1000) : DEFAULT_PAGE_RANK_LIMIT,
      concurrency: Number(options.concurrency ?? this.maxConcurrency),
      cacheTtl: options.cacheTtl ?? undefined,
      forceRefresh: Boolean(options.forceRefresh),
    };

    return normalized;
  }

  async executePageRank(options) {
    const params = {
      graphName: options.graphName,
      maxIterations: options.maxIterations,
      dampingFactor: options.dampingFactor,
      limit: options.limit,
      concurrency: Math.max(1, Math.min(options.concurrency, 64)),
    };

    const query = `
      CALL gds.pageRank.stream($graphName, {
        maxIterations: $maxIterations,
        dampingFactor: $dampingFactor,
        concurrency: $concurrency
      })
      YIELD nodeId, score
      WITH nodeId, score, gds.util.asNode(nodeId) AS node
      RETURN node.id AS nodeId, coalesce(node.label, node.id) AS label, score
      ORDER BY score DESC
      LIMIT $limit
    `;

    return this.withSession(neo4j.session.READ, async (session) => {
      const result = await session.run(query, params);
      return result.records.map((record) => {
        const score = record.get('score');
        const numericScore = typeof score === 'number' ? score : toNumber(score);
        const nodeId = record.get('nodeId');
        return {
          nodeId,
          label: record.get('label'),
          score: numericScore,
          pageRank: numericScore,
        };
      });
    });
  }

  /**
   * Analyze relationship patterns
   */
  async analyzeRelationshipPatterns(investigationId = null) {
    const session = this.getDriver().session();

    try {
      const constraints = investigationId ? 'WHERE r.investigation_id = $investigationId' : '';

      const params = investigationId ? { investigationId } : {};

      const query = `
        MATCH ()-[r]->()
        ${constraints}
        WITH type(r) as relationshipType, count(r) as frequency
        RETURN relationshipType, frequency
        ORDER BY frequency DESC
      `;

      const result = await session.run(query, params);

      const patterns = result.records.map((record) => ({
        relationshipType: record.get('relationshipType'),
        frequency: record.get('frequency').toNumber(),
      }));

      const totalRelationships = patterns.reduce((sum, p) => sum + p.frequency, 0);

      return {
        patterns: patterns.map((p) => ({
          ...p,
          percentage: (p.frequency / totalRelationships) * 100,
        })),
        totalRelationships,
        uniqueTypes: patterns.length,
      };
    } catch (error) {
      this.logger.error('Error analyzing relationship patterns:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Find anomalous nodes or relationships
   */
  async detectAnomalies(investigationId = null) {
    const session = this.getDriver().session();

    try {
      const constraints = investigationId
        ? 'WHERE n.investigation_id = $investigationId AND m.investigation_id = $investigationId'
        : '';

      const params = investigationId ? { investigationId } : {};

      // Find nodes with unusually high degree
      const highDegreeQuery = `
        MATCH (n)-[r]-(m)
        ${constraints}
        WITH n, count(r) as degree
        WITH collect(degree) as degrees
        WITH degrees, 
             reduce(sum = 0, d in degrees | sum + d) / size(degrees) as avgDegree,
             reduce(sum = 0, d in degrees | sum + (d - reduce(avg = 0, x in degrees | avg + x) / size(degrees))^2) / size(degrees) as variance
        WITH avgDegree, sqrt(variance) as stdDev
        MATCH (n)-[r]-(m)
        ${constraints}
        WITH n, count(r) as degree, avgDegree, stdDev
        WHERE degree > avgDegree + 2 * stdDev
        RETURN n.id as nodeId, n.label as label, degree, avgDegree, stdDev
        ORDER BY degree DESC
        LIMIT 20
      `;

      // Find isolated nodes
      const isolatedQuery = `
        MATCH (n)
        ${constraints.replace('AND m.investigation_id', 'AND n.investigation_id')}
        WHERE NOT (n)-[]-()
        RETURN n.id as nodeId, n.label as label
        LIMIT 50
      `;

      // Find nodes with unusual relationship diversity
      const diversityQuery = `
        MATCH (n)-[r]-(m)
        ${constraints}
        WITH n, collect(DISTINCT type(r)) as relationshipTypes
        WITH n, relationshipTypes, size(relationshipTypes) as diversity
        WHERE diversity > 5
        RETURN n.id as nodeId, n.label as label, diversity, relationshipTypes
        ORDER BY diversity DESC
        LIMIT 20
      `;

      const [highDegreeResult, isolatedResult, diversityResult] = await Promise.all([
        session.run(highDegreeQuery, params),
        session.run(isolatedQuery, params),
        session.run(diversityQuery, params),
      ]);

      return {
        highDegreeNodes: highDegreeResult.records.map((record) => ({
          nodeId: record.get('nodeId'),
          label: record.get('label'),
          degree: record.get('degree').toNumber(),
          avgDegree: record.get('avgDegree'),
          standardDeviations:
            (record.get('degree').toNumber() - record.get('avgDegree')) / record.get('stdDev'),
        })),
        isolatedNodes: isolatedResult.records.map((record) => ({
          nodeId: record.get('nodeId'),
          label: record.get('label'),
        })),
        diverseNodes: diversityResult.records.map((record) => ({
          nodeId: record.get('nodeId'),
          label: record.get('label'),
          diversity: record.get('diversity').toNumber(),
          relationshipTypes: record.get('relationshipTypes'),
        })),
      };
    } catch (error) {
      this.logger.error('Error detecting anomalies:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Generate comprehensive graph analysis report
   */
  async generateAnalysisReport(investigationId = null) {
    try {
      const [basicMetrics, centrality, communities, pageRank, relationshipPatterns, anomalies] =
        await Promise.all([
          this.calculateBasicMetrics(investigationId),
          this.calculateCentralityMeasures(investigationId),
          this.detectCommunities(investigationId),
          this.calculatePageRank(investigationId),
          this.analyzeRelationshipPatterns(investigationId),
          this.detectAnomalies(investigationId),
        ]);

      return {
        investigationId,
        timestamp: new Date(),
        basicMetrics,
        centrality,
        communities: communities.slice(0, 10),
        topNodes: pageRank.slice(0, 20),
        relationshipPatterns,
        anomalies,
        insights: this.generateInsights({
          basicMetrics,
          centrality,
          communities,
          pageRank,
          relationshipPatterns,
          anomalies,
        }),
      };
    } catch (error) {
      this.logger.error('Error generating analysis report:', error);
      throw error;
    }
  }

  /**
   * Generate insights from analysis results
   */
  generateInsights(analysisData) {
    const insights = [];
    const { basicMetrics, centrality, communities, pageRank, relationshipPatterns, anomalies } =
      analysisData;

    // Network size insights
    if (basicMetrics.nodeCount > 1000) {
      insights.push({
        type: 'network_size',
        severity: 'info',
        message: `Large network detected with ${basicMetrics.nodeCount} entities and ${basicMetrics.edgeCount} relationships.`,
      });
    }

    // Density insights
    if (basicMetrics.density > 0.7) {
      insights.push({
        type: 'density',
        severity: 'warning',
        message: `High network density (${(basicMetrics.density * 100).toFixed(1)}%) suggests many interconnections. Consider filtering or clustering.`,
      });
    } else if (basicMetrics.density < 0.1) {
      insights.push({
        type: 'density',
        severity: 'info',
        message: `Low network density (${(basicMetrics.density * 100).toFixed(1)}%) indicates sparse connections. Look for key bridges.`,
      });
    }

    // Central node insights
    if (
      centrality.degreeCentrality.length > 0 &&
      centrality.degreeCentrality[0].score > basicMetrics.avgDegree * 3
    ) {
      insights.push({
        type: 'central_node',
        severity: 'high',
        message: `Entity "${centrality.degreeCentrality[0].label}" appears to be a critical hub with ${centrality.degreeCentrality[0].score} connections.`,
      });
    }

    // Community insights
    if (communities.length > 1) {
      const largestCommunity = communities[0];
      insights.push({
        type: 'communities',
        severity: 'info',
        message: `${communities.length} distinct communities detected. Largest contains ${largestCommunity.size} entities.`,
      });
    }

    // Anomaly insights
    if (anomalies.highDegreeNodes.length > 0) {
      insights.push({
        type: 'anomaly',
        severity: 'warning',
        message: `${anomalies.highDegreeNodes.length} entities with unusually high connectivity detected. May warrant investigation.`,
      });
    }

    if (anomalies.isolatedNodes.length > 0) {
      insights.push({
        type: 'isolation',
        severity: 'info',
        message: `${anomalies.isolatedNodes.length} isolated entities found. Consider their relevance to the investigation.`,
      });
    }

    // Relationship pattern insights
    if (relationshipPatterns.patterns.length > 0) {
      const dominantPattern = relationshipPatterns.patterns[0];
      if (dominantPattern.percentage > 40) {
        insights.push({
          type: 'relationship_pattern',
          severity: 'info',
          message: `"${dominantPattern.relationshipType}" relationships dominate (${dominantPattern.percentage.toFixed(1)}% of all connections).`,
        });
      }
    }

    return insights;
  }

  /**
   * Initialize Neo4j driver
   */
  setDriver(driver) {
    this.driver = driver;
  }

  /**
   * Calculate graph clustering coefficient
   */
  async calculateClusteringCoefficient(investigationId = null) {
    const session = this.getDriver().session();

    try {
      const constraints = investigationId ? 'WHERE n.investigation_id = $investigationId' : '';

      const params = investigationId ? { investigationId } : {};

      const query = `
        MATCH (n)
        ${constraints}
        OPTIONAL MATCH (n)-[]-(neighbor1)-[]-(neighbor2)-[]-(n)
        WHERE neighbor1 <> neighbor2
        WITH n, count(DISTINCT neighbor1) as neighbors, count(DISTINCT [neighbor1, neighbor2]) as triangles
        WITH n, neighbors, triangles,
             CASE WHEN neighbors > 1 
                  THEN toFloat(triangles) / (neighbors * (neighbors - 1))
                  ELSE 0 END as localClustering
        RETURN avg(localClustering) as globalClustering,
               collect({nodeId: n.id, clustering: localClustering}) as localClusterings
      `;

      const result = await session.run(query, params);

      if (result.records.length === 0) {
        return { globalClustering: 0, localClusterings: [] };
      }

      const record = result.records[0];
      return {
        globalClustering: record.get('globalClustering') || 0,
        localClusterings: record.get('localClusterings').map((item) => ({
          nodeId: item.nodeId,
          clustering: item.clustering,
        })),
      };
    } catch (error) {
      this.logger.error('Error calculating clustering coefficient:', error);
      throw error;
    } finally {
      await session.close();
    }
  }
}

module.exports = GraphAnalyticsService;
