/**
 * GraphTraversal - Semantic knowledge graph traversal for OSINT fusion
 *
 * Provides optimized Neo4j queries for multi-hop traversal,
 * path finding, and subgraph extraction with p95 < 2s target.
 */

import { getNeo4jDriver, isNeo4jMockMode } from '../../../server/src/db/neo4j';
import {
  OsintEntity,
  OsintRelationship,
  OsintEntityType,
  OsintRelationshipType,
  GraphTraversalConfig,
  GraphTraversalResult,
  ClassificationLevel,
} from './types';

export interface TraversalMetrics {
  queriesExecuted: number;
  totalLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  cacheHits: number;
  cacheMisses: number;
}

export class GraphTraversal {
  private driver: ReturnType<typeof getNeo4jDriver>;
  private queryCache: Map<string, { result: GraphTraversalResult; expiry: number }>;
  private latencyHistogram: number[];
  private metrics: TraversalMetrics;
  private cacheTtlMs: number;

  constructor(cacheTtlMs: number = 60000) {
    this.driver = getNeo4jDriver();
    this.queryCache = new Map();
    this.latencyHistogram = [];
    this.cacheTtlMs = cacheTtlMs;
    this.metrics = {
      queriesExecuted: 0,
      totalLatencyMs: 0,
      p95LatencyMs: 0,
      p99LatencyMs: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };
  }

  /**
   * Execute a graph traversal query
   */
  async traverse(config: GraphTraversalConfig): Promise<GraphTraversalResult> {
    const cacheKey = this.computeCacheKey(config);
    const cached = this.queryCache.get(cacheKey);

    if (cached && cached.expiry > Date.now()) {
      this.metrics.cacheHits++;
      return cached.result;
    }

    this.metrics.cacheMisses++;
    const startTime = Date.now();

    try {
      const result = await this.executeTraversal(config);
      const latency = Date.now() - startTime;

      this.recordLatency(latency);
      this.queryCache.set(cacheKey, {
        result,
        expiry: Date.now() + this.cacheTtlMs,
      });

      return result;
    } catch (error) {
      const latency = Date.now() - startTime;
      this.recordLatency(latency);
      throw error;
    }
  }

  /**
   * Find shortest paths between entities
   */
  async findShortestPaths(
    sourceId: string,
    targetId: string,
    maxDepth: number = 5,
    relationshipTypes?: OsintRelationshipType[],
  ): Promise<GraphTraversalResult> {
    const startTime = Date.now();

    const relationshipFilter = relationshipTypes
      ? `:${relationshipTypes.join('|')}`
      : '';

    const cypher = `
      MATCH path = shortestPath(
        (source:OsintEntity {id: $sourceId})-[r${relationshipFilter}*1..${maxDepth}]-(target:OsintEntity {id: $targetId})
      )
      WHERE source <> target
      RETURN path,
             [n IN nodes(path) | n] as pathNodes,
             [r IN relationships(path) | r] as pathRels,
             reduce(w = 0.0, rel IN relationships(path) | w + coalesce(rel.weight, 1.0)) as totalWeight
      ORDER BY totalWeight ASC
      LIMIT 10
    `;

    const session = this.driver.session();
    try {
      const result = await session.run(cypher, { sourceId, targetId });
      const latency = Date.now() - startTime;
      this.recordLatency(latency);

      const paths = result.records.map((record) => {
        const pathNodes = record.get('pathNodes') || [];
        const pathRels = record.get('pathRels') || [];
        return {
          nodes: pathNodes.map((n: any) => n.properties?.id || n.id),
          edges: pathRels.map((r: any) => r.properties?.id || r.identity?.toString()),
          totalWeight: record.get('totalWeight') || 0,
        };
      });

      // Extract unique nodes and edges from all paths
      const nodeIds = new Set<string>();
      const edgeIds = new Set<string>();
      paths.forEach((p) => {
        p.nodes.forEach((n) => nodeIds.add(n));
        p.edges.forEach((e) => edgeIds.add(e));
      });

      return {
        nodes: await this.fetchEntitiesByIds([...nodeIds]),
        edges: await this.fetchRelationshipsByIds([...edgeIds]),
        paths,
        metrics: {
          nodesVisited: nodeIds.size,
          edgesTraversed: edgeIds.size,
          depthReached: Math.max(...paths.map((p) => p.nodes.length - 1), 0),
          latencyMs: latency,
        },
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Find all entities within N hops of a starting entity
   */
  async findNeighborhood(
    entityId: string,
    depth: number = 2,
    filters?: GraphTraversalConfig['filters'],
  ): Promise<GraphTraversalResult> {
    const config: GraphTraversalConfig = {
      startNodeIds: [entityId],
      direction: 'both',
      maxDepth: depth,
      filters,
      aggregation: 'subgraph',
    };

    return this.traverse(config);
  }

  /**
   * Find entities by semantic similarity using embeddings
   */
  async findSimilarEntities(
    embedding: number[],
    topK: number = 10,
    minSimilarity: number = 0.7,
    entityTypes?: OsintEntityType[],
  ): Promise<OsintEntity[]> {
    const startTime = Date.now();

    // Use cosine similarity on stored embeddings
    const typeFilter = entityTypes
      ? `AND e.type IN $entityTypes`
      : '';

    const cypher = `
      MATCH (e:OsintEntity)
      WHERE e.embedding IS NOT NULL ${typeFilter}
      WITH e,
           gds.similarity.cosine(e.embedding, $embedding) AS similarity
      WHERE similarity >= $minSimilarity
      RETURN e
      ORDER BY similarity DESC
      LIMIT $topK
    `;

    const session = this.driver.session();
    try {
      const result = await session.run(cypher, {
        embedding,
        minSimilarity,
        topK,
        entityTypes: entityTypes || [],
      });

      const latency = Date.now() - startTime;
      this.recordLatency(latency);

      return result.records.map((record) => this.mapRecordToEntity(record.get('e')));
    } catch (error) {
      // If GDS not available, fall back to linear scan
      if (String(error).includes('gds.similarity')) {
        return this.findSimilarEntitiesFallback(embedding, topK, minSimilarity, entityTypes);
      }
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Fallback similarity search without GDS
   */
  private async findSimilarEntitiesFallback(
    embedding: number[],
    topK: number,
    minSimilarity: number,
    entityTypes?: OsintEntityType[],
  ): Promise<OsintEntity[]> {
    const typeFilter = entityTypes ? `WHERE e.type IN $entityTypes` : '';

    const cypher = `
      MATCH (e:OsintEntity)
      ${typeFilter}
      WHERE e.embedding IS NOT NULL
      RETURN e
    `;

    const session = this.driver.session();
    try {
      const result = await session.run(cypher, { entityTypes: entityTypes || [] });

      const entitiesWithSimilarity = result.records
        .map((record) => {
          const entity = this.mapRecordToEntity(record.get('e'));
          const similarity = this.cosineSimilarity(embedding, entity.embedding || []);
          return { entity, similarity };
        })
        .filter((item) => item.similarity >= minSimilarity)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);

      return entitiesWithSimilarity.map((item) => item.entity);
    } finally {
      await session.close();
    }
  }

  /**
   * Execute the core traversal query
   */
  private async executeTraversal(config: GraphTraversalConfig): Promise<GraphTraversalResult> {
    const {
      startNodeIds,
      relationshipTypes,
      direction,
      maxDepth,
      filters,
      aggregation,
      orderBy,
      limit,
    } = config;

    const directionPattern = this.getDirectionPattern(direction);
    const relationshipFilter = relationshipTypes
      ? `:${relationshipTypes.join('|')}`
      : '';

    const filterClauses: string[] = [];
    const params: Record<string, any> = { startNodeIds };

    if (filters?.entityTypes && filters.entityTypes.length > 0) {
      filterClauses.push('n.type IN $entityTypes');
      params.entityTypes = filters.entityTypes;
    }

    if (filters?.minConfidence !== undefined) {
      filterClauses.push('n.confidence >= $minConfidence');
      params.minConfidence = filters.minConfidence;
    }

    if (filters?.classification && filters.classification.length > 0) {
      filterClauses.push('n.classification IN $classification');
      params.classification = filters.classification;
    }

    const whereClause = filterClauses.length > 0
      ? `WHERE ${filterClauses.join(' AND ')}`
      : '';

    const orderClause = orderBy
      ? `ORDER BY n.${orderBy} DESC`
      : '';

    const limitClause = limit ? `LIMIT ${limit}` : 'LIMIT 1000';

    const cypher = `
      MATCH (start:OsintEntity)
      WHERE start.id IN $startNodeIds
      CALL {
        WITH start
        MATCH path = (start)${directionPattern}[r${relationshipFilter}*1..${maxDepth}]${directionPattern}(n:OsintEntity)
        ${whereClause}
        RETURN DISTINCT n, r, length(path) as depth
        ${orderClause}
        ${limitClause}
      }
      WITH collect(DISTINCT n) as nodes, collect(DISTINCT r) as rels
      RETURN nodes, rels
    `;

    const session = this.driver.session();
    try {
      const result = await session.run(cypher, params);
      this.metrics.queriesExecuted++;

      if (result.records.length === 0) {
        return this.emptyResult();
      }

      const record = result.records[0];
      const nodesData = record.get('nodes') || [];
      const relsData = (record.get('rels') || []).flat();

      const nodes = nodesData.map((n: any) => this.mapRecordToEntity(n));
      const edges = relsData
        .filter((r: any) => r != null)
        .map((r: any) => this.mapRecordToRelationship(r));

      return {
        nodes,
        edges,
        paths: [],
        metrics: {
          nodesVisited: nodes.length,
          edgesTraversed: edges.length,
          depthReached: maxDepth,
          latencyMs: 0, // Will be set by caller
        },
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Store an OSINT entity in the graph
   */
  async storeEntity(entity: OsintEntity): Promise<OsintEntity> {
    const cypher = `
      MERGE (e:OsintEntity {id: $id})
      SET e += $props,
          e.embedding = $embedding,
          e.updatedAt = datetime()
      RETURN e
    `;

    const props = {
      type: entity.type,
      label: entity.label,
      description: entity.description || '',
      aliases: entity.aliases,
      confidence: entity.confidence,
      classification: entity.classification,
      validationStatus: JSON.stringify(entity.validationStatus),
      attributes: JSON.stringify(entity.attributes),
      sources: JSON.stringify(entity.sources),
    };

    const session = this.driver.session();
    try {
      const result = await session.run(cypher, {
        id: entity.id,
        props,
        embedding: entity.embedding || [],
      });

      return this.mapRecordToEntity(result.records[0]?.get('e'));
    } finally {
      await session.close();
    }
  }

  /**
   * Store an OSINT relationship in the graph
   */
  async storeRelationship(relationship: OsintRelationship): Promise<OsintRelationship> {
    const cypher = `
      MATCH (source:OsintEntity {id: $sourceId})
      MATCH (target:OsintEntity {id: $targetId})
      MERGE (source)-[r:${relationship.type} {id: $relId}]->(target)
      SET r += $props
      RETURN r, source, target
    `;

    const props = {
      confidence: relationship.confidence,
      weight: relationship.weight,
      attributes: JSON.stringify(relationship.attributes),
      sources: JSON.stringify(relationship.sources),
      validationStatus: JSON.stringify(relationship.validationStatus),
      temporalBounds: relationship.temporalBounds
        ? JSON.stringify(relationship.temporalBounds)
        : null,
    };

    const session = this.driver.session();
    try {
      await session.run(cypher, {
        sourceId: relationship.sourceEntityId,
        targetId: relationship.targetEntityId,
        relId: relationship.id,
        props,
      });

      return relationship;
    } finally {
      await session.close();
    }
  }

  /**
   * Fetch entities by IDs
   */
  async fetchEntitiesByIds(ids: string[]): Promise<OsintEntity[]> {
    if (ids.length === 0) return [];

    const cypher = `
      MATCH (e:OsintEntity)
      WHERE e.id IN $ids
      RETURN e
    `;

    const session = this.driver.session();
    try {
      const result = await session.run(cypher, { ids });
      return result.records.map((r) => this.mapRecordToEntity(r.get('e')));
    } finally {
      await session.close();
    }
  }

  /**
   * Fetch relationships by IDs
   */
  async fetchRelationshipsByIds(ids: string[]): Promise<OsintRelationship[]> {
    if (ids.length === 0) return [];

    const cypher = `
      MATCH ()-[r]->()
      WHERE r.id IN $ids
      RETURN r, startNode(r) as source, endNode(r) as target
    `;

    const session = this.driver.session();
    try {
      const result = await session.run(cypher, { ids });
      return result.records.map((r) => this.mapRecordToRelationship(r.get('r')));
    } finally {
      await session.close();
    }
  }

  /**
   * Get centrality scores for entities
   */
  async computeCentrality(
    entityIds: string[],
    algorithm: 'degree' | 'betweenness' | 'pagerank' = 'degree',
  ): Promise<Map<string, number>> {
    const centralityMap = new Map<string, number>();

    // Simple degree centrality fallback (works without GDS)
    const cypher = `
      MATCH (e:OsintEntity)
      WHERE e.id IN $entityIds
      OPTIONAL MATCH (e)-[r]-()
      WITH e, count(r) as degree
      RETURN e.id as id, degree
    `;

    const session = this.driver.session();
    try {
      const result = await session.run(cypher, { entityIds });

      for (const record of result.records) {
        const id = record.get('id');
        const degree = record.get('degree').toNumber?.() || record.get('degree');
        centralityMap.set(id, degree);
      }

      // Normalize scores
      const maxDegree = Math.max(...centralityMap.values(), 1);
      for (const [id, degree] of centralityMap) {
        centralityMap.set(id, degree / maxDegree);
      }

      return centralityMap;
    } finally {
      await session.close();
    }
  }

  /**
   * Map Neo4j record to OsintEntity
   */
  private mapRecordToEntity(record: any): OsintEntity {
    if (!record) {
      return this.createEmptyEntity();
    }

    const props = record.properties || record;

    return {
      id: props.id || '',
      type: props.type || 'person',
      label: props.label || '',
      description: props.description || undefined,
      aliases: Array.isArray(props.aliases) ? props.aliases : [],
      attributes: this.safeJsonParse(props.attributes, {}),
      confidence: props.confidence || 0.5,
      sources: this.safeJsonParse(props.sources, []),
      embedding: Array.isArray(props.embedding) ? props.embedding : undefined,
      validationStatus: this.safeJsonParse(props.validationStatus, {
        validated: false,
        validator: 'multi_source',
        confidence: 0,
        corroboratingSourceCount: 0,
        conflictingSources: [],
        hallucinationRisk: 'high',
      }),
      classification: props.classification || 'UNCLASSIFIED',
      createdAt: props.createdAt ? new Date(props.createdAt) : new Date(),
      updatedAt: props.updatedAt ? new Date(props.updatedAt) : new Date(),
    };
  }

  /**
   * Map Neo4j record to OsintRelationship
   */
  private mapRecordToRelationship(record: any): OsintRelationship {
    if (!record) {
      return this.createEmptyRelationship();
    }

    const props = record.properties || record;

    return {
      id: props.id || '',
      type: record.type || props.type || 'related_to',
      sourceEntityId: props.sourceEntityId || '',
      targetEntityId: props.targetEntityId || '',
      confidence: props.confidence || 0.5,
      weight: props.weight || 1.0,
      attributes: this.safeJsonParse(props.attributes, {}),
      temporalBounds: this.safeJsonParse(props.temporalBounds, undefined),
      sources: this.safeJsonParse(props.sources, []),
      validationStatus: this.safeJsonParse(props.validationStatus, {
        validated: false,
        validator: 'multi_source',
        confidence: 0,
        corroboratingSourceCount: 0,
        conflictingSources: [],
        hallucinationRisk: 'high',
      }),
    };
  }

  /**
   * Helper to get direction pattern for Cypher
   */
  private getDirectionPattern(direction: GraphTraversalConfig['direction']): string {
    switch (direction) {
      case 'outgoing':
        return '->';
      case 'incoming':
        return '<-';
      case 'both':
      default:
        return '-';
    }
  }

  /**
   * Compute cache key for query
   */
  private computeCacheKey(config: GraphTraversalConfig): string {
    const data = JSON.stringify(config);
    return `traversal:${Buffer.from(data).toString('base64').substring(0, 32)}`;
  }

  /**
   * Cosine similarity calculation
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length === 0 || b.length === 0) return 0;

    const minLength = Math.min(a.length, b.length);
    let dot = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < minLength; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }

    if (magA === 0 || magB === 0) return 0;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
  }

  /**
   * Record latency for metrics
   */
  private recordLatency(latencyMs: number): void {
    this.latencyHistogram.push(latencyMs);
    this.metrics.totalLatencyMs += latencyMs;

    // Keep only last 1000 latencies for percentile calculation
    if (this.latencyHistogram.length > 1000) {
      this.latencyHistogram.shift();
    }

    // Update percentiles
    const sorted = [...this.latencyHistogram].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    this.metrics.p95LatencyMs = sorted[p95Index] || 0;
    this.metrics.p99LatencyMs = sorted[p99Index] || 0;
  }

  /**
   * Safe JSON parse helper
   */
  private safeJsonParse<T>(value: any, defaultValue: T): T {
    if (value === null || value === undefined) return defaultValue;
    if (typeof value === 'object') return value as T;

    try {
      return JSON.parse(value);
    } catch {
      return defaultValue;
    }
  }

  /**
   * Create empty result
   */
  private emptyResult(): GraphTraversalResult {
    return {
      nodes: [],
      edges: [],
      paths: [],
      metrics: {
        nodesVisited: 0,
        edgesTraversed: 0,
        depthReached: 0,
        latencyMs: 0,
      },
    };
  }

  /**
   * Create empty entity placeholder
   */
  private createEmptyEntity(): OsintEntity {
    return {
      id: '',
      type: 'person',
      label: '',
      aliases: [],
      attributes: {},
      confidence: 0,
      sources: [],
      validationStatus: {
        validated: false,
        validator: 'multi_source',
        confidence: 0,
        corroboratingSourceCount: 0,
        conflictingSources: [],
        hallucinationRisk: 'high',
      },
      classification: 'UNCLASSIFIED',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Create empty relationship placeholder
   */
  private createEmptyRelationship(): OsintRelationship {
    return {
      id: '',
      type: 'related_to',
      sourceEntityId: '',
      targetEntityId: '',
      confidence: 0,
      weight: 0,
      attributes: {},
      sources: [],
      validationStatus: {
        validated: false,
        validator: 'multi_source',
        confidence: 0,
        corroboratingSourceCount: 0,
        conflictingSources: [],
        hallucinationRisk: 'high',
      },
    };
  }

  /**
   * Get current metrics
   */
  getMetrics(): TraversalMetrics {
    return { ...this.metrics };
  }

  /**
   * Clear query cache
   */
  clearCache(): void {
    this.queryCache.clear();
  }

  /**
   * Check if running in mock mode
   */
  isMockMode(): boolean {
    return isNeo4jMockMode();
  }
}
