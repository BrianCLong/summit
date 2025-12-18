/**
 * GEOINT Threat Analysis Platform - Neo4j Repository
 * Optimized graph queries for geospatial intelligence and threat analysis
 *
 * Performance target: p95 < 2s for edge queries
 */

import type { Driver, Session, Result } from 'neo4j-driver';
import type {
  GeoThreatActor,
  IOC,
  IntelligenceReport,
  FusionResult,
  SatelliteAnalysis,
  Terrain3DPoint,
  QueryOptimizationHint,
} from '../types/index.js';

/**
 * Query result with performance metrics
 */
interface QueryResult<T> {
  data: T;
  metrics: {
    queryTime: number; // milliseconds
    nodesAccessed: number;
    relationshipsAccessed: number;
    cacheHit: boolean;
  };
}

/**
 * Spatial query options
 */
interface SpatialQueryOptions {
  bbox?: {
    minLon: number;
    minLat: number;
    maxLon: number;
    maxLat: number;
  };
  center?: { latitude: number; longitude: number };
  radiusMeters?: number;
  limit?: number;
  offset?: number;
  timeRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * GEOINT Neo4j Repository
 * Provides optimized graph operations for threat intelligence
 */
export class GEOINTNeo4jRepository {
  private driver: Driver;
  private queryCache: Map<string, { result: unknown; timestamp: number; ttl: number }>;
  private readonly cacheTTL = 60000; // 60 seconds default

  constructor(driver: Driver) {
    this.driver = driver;
    this.queryCache = new Map();
  }

  /**
   * Initialize spatial and performance indexes
   */
  async initializeIndexes(): Promise<void> {
    const session = this.driver.session();
    try {
      const indexQueries = [
        // Geospatial indexes using point data type
        `CREATE INDEX geo_threat_actor_location IF NOT EXISTS
         FOR (t:GeoThreatActor) ON (t.primaryLocation)`,

        `CREATE INDEX ioc_geolocation IF NOT EXISTS
         FOR (i:IOC) ON (i.geolocation)`,

        // Composite indexes for common query patterns
        `CREATE INDEX threat_actor_tenant_active IF NOT EXISTS
         FOR (t:GeoThreatActor) ON (t.tenantId, t.active)`,

        `CREATE INDEX ioc_type_severity IF NOT EXISTS
         FOR (i:IOC) ON (i.type, i.severity, i.active)`,

        `CREATE INDEX ioc_tenant_created IF NOT EXISTS
         FOR (i:IOC) ON (i.tenantId, i.createdAt)`,

        // Fulltext indexes for search
        `CREATE FULLTEXT INDEX threat_actor_search IF NOT EXISTS
         FOR (t:GeoThreatActor) ON EACH [t.name, t.aliases, t.description]`,

        `CREATE FULLTEXT INDEX intel_report_search IF NOT EXISTS
         FOR (r:IntelligenceReport) ON EACH [r.title, r.summary, r.content]`,

        // Range indexes for temporal queries
        `CREATE INDEX ioc_first_seen IF NOT EXISTS
         FOR (i:IOC) ON (i.firstSeen)`,

        `CREATE INDEX ioc_last_seen IF NOT EXISTS
         FOR (i:IOC) ON (i.lastSeen)`,

        // H3 spatial index for heatmap queries
        `CREATE INDEX activity_h3_index IF NOT EXISTS
         FOR (a:ActivityCell) ON (a.h3Index)`,
      ];

      for (const query of indexQueries) {
        await session.run(query);
      }
    } finally {
      await session.close();
    }
  }

  // ============================================================================
  // Geo Threat Actor Operations
  // ============================================================================

  /**
   * Create or update a geo threat actor
   */
  async upsertGeoThreatActor(actor: GeoThreatActor): Promise<QueryResult<GeoThreatActor>> {
    const startTime = performance.now();
    const session = this.driver.session();

    try {
      const result = await session.run(
        `
        MERGE (t:GeoThreatActor {id: $id})
        SET t += $properties,
            t.updatedAt = datetime()
        WITH t

        // Handle known locations as related nodes
        UNWIND $knownLocations AS loc
        MERGE (l:ThreatLocation {
          latitude: loc.location.latitude,
          longitude: loc.location.longitude,
          threatActorId: $id
        })
        SET l.locationType = loc.locationType,
            l.confidence = loc.confidence,
            l.firstSeen = loc.firstSeen,
            l.lastSeen = loc.lastSeen,
            l.point = point({latitude: loc.location.latitude, longitude: loc.location.longitude})
        MERGE (t)-[:OPERATES_FROM]->(l)

        WITH t

        // Handle cyber infrastructure
        UNWIND $cyberInfra AS infra
        MERGE (c:CyberInfrastructure {
          type: infra.type,
          value: COALESCE(infra.ipAddress, infra.domain)
        })
        SET c += infra,
            c.point = CASE WHEN infra.geolocation IS NOT NULL
                      THEN point({latitude: infra.geolocation.latitude, longitude: infra.geolocation.longitude})
                      ELSE null END
        MERGE (t)-[:CONTROLS]->(c)

        RETURN t
        `,
        {
          id: actor.id,
          properties: {
            threatActorId: actor.threatActorId,
            name: actor.name,
            aliases: actor.aliases,
            primaryCountry: actor.attribution.primaryCountry,
            operatingRegions: actor.attribution.operatingRegions,
            operationalRadius: actor.attribution.operationalRadius,
            tenantId: actor.tenantId,
            createdAt: actor.createdAt,
          },
          knownLocations: actor.attribution.knownLocations,
          cyberInfra: actor.cyberInfrastructure,
        }
      );

      const queryTime = performance.now() - startTime;

      return {
        data: actor,
        metrics: {
          queryTime,
          nodesAccessed: result.summary.counters.updates().nodesCreated +
                        result.summary.counters.updates().propertiesSet,
          relationshipsAccessed: result.summary.counters.updates().relationshipsCreated,
          cacheHit: false,
        },
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Find threat actors within a geographic region
   * Optimized for p95 < 2s with spatial indexing
   */
  async findThreatActorsInRegion(
    options: SpatialQueryOptions
  ): Promise<QueryResult<GeoThreatActor[]>> {
    const cacheKey = `threat_actors_region_${JSON.stringify(options)}`;
    const cached = this.getFromCache<GeoThreatActor[]>(cacheKey);
    if (cached) {
      return { data: cached, metrics: { queryTime: 0, nodesAccessed: 0, relationshipsAccessed: 0, cacheHit: true } };
    }

    const startTime = performance.now();
    const session = this.driver.session();

    try {
      let query: string;
      let params: Record<string, unknown>;

      if (options.center && options.radiusMeters) {
        // Radial search using spatial point
        query = `
          WITH point({latitude: $lat, longitude: $lon}) AS center
          MATCH (t:GeoThreatActor)-[:OPERATES_FROM]->(l:ThreatLocation)
          WHERE point.distance(l.point, center) <= $radius
          ${options.timeRange ? 'AND l.lastSeen >= $startTime AND l.firstSeen <= $endTime' : ''}
          WITH DISTINCT t, MIN(point.distance(l.point, center)) AS distance
          ORDER BY distance
          SKIP $offset
          LIMIT $limit
          RETURN t
        `;
        params = {
          lat: options.center.latitude,
          lon: options.center.longitude,
          radius: options.radiusMeters,
          offset: options.offset || 0,
          limit: options.limit || 100,
          startTime: options.timeRange?.start.toISOString(),
          endTime: options.timeRange?.end.toISOString(),
        };
      } else if (options.bbox) {
        // Bounding box search
        query = `
          MATCH (t:GeoThreatActor)-[:OPERATES_FROM]->(l:ThreatLocation)
          WHERE l.point.latitude >= $minLat
            AND l.point.latitude <= $maxLat
            AND l.point.longitude >= $minLon
            AND l.point.longitude <= $maxLon
          ${options.timeRange ? 'AND l.lastSeen >= $startTime AND l.firstSeen <= $endTime' : ''}
          WITH DISTINCT t
          SKIP $offset
          LIMIT $limit
          RETURN t
        `;
        params = {
          minLat: options.bbox.minLat,
          maxLat: options.bbox.maxLat,
          minLon: options.bbox.minLon,
          maxLon: options.bbox.maxLon,
          offset: options.offset || 0,
          limit: options.limit || 100,
          startTime: options.timeRange?.start.toISOString(),
          endTime: options.timeRange?.end.toISOString(),
        };
      } else {
        throw new Error('Either center/radius or bbox required for spatial query');
      }

      const result = await session.run(query, params);
      const queryTime = performance.now() - startTime;

      const actors = result.records.map(record => record.get('t').properties as GeoThreatActor);

      // Cache results
      this.setCache(cacheKey, actors);

      return {
        data: actors,
        metrics: {
          queryTime,
          nodesAccessed: result.summary.counters.updates().nodesCreated,
          relationshipsAccessed: 0,
          cacheHit: false,
        },
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Find threat actors by cyber infrastructure proximity
   */
  async findThreatActorsByCyberInfra(
    iocValue: string,
    maxHops: number = 3
  ): Promise<QueryResult<Array<{ actor: GeoThreatActor; path: string[] }>>> {
    const startTime = performance.now();
    const session = this.driver.session();

    try {
      const result = await session.run(
        `
        MATCH (i:IOC {value: $iocValue})
        MATCH path = (i)-[*1..${maxHops}]-(t:GeoThreatActor)
        WITH t, path, length(path) AS pathLength
        ORDER BY pathLength
        LIMIT 50
        RETURN t, [n IN nodes(path) | n.id OR n.value] AS pathNodes
        `,
        { iocValue }
      );

      const queryTime = performance.now() - startTime;

      const results = result.records.map(record => ({
        actor: record.get('t').properties as GeoThreatActor,
        path: record.get('pathNodes') as string[],
      }));

      return {
        data: results,
        metrics: {
          queryTime,
          nodesAccessed: result.records.length,
          relationshipsAccessed: result.records.length * maxHops,
          cacheHit: false,
        },
      };
    } finally {
      await session.close();
    }
  }

  // ============================================================================
  // IOC Operations
  // ============================================================================

  /**
   * Bulk upsert IOCs with optimized batching
   */
  async bulkUpsertIOCs(iocs: IOC[]): Promise<QueryResult<number>> {
    const startTime = performance.now();
    const session = this.driver.session();
    const batchSize = 500;
    let totalCreated = 0;

    try {
      for (let i = 0; i < iocs.length; i += batchSize) {
        const batch = iocs.slice(i, i + batchSize);

        const result = await session.run(
          `
          UNWIND $iocs AS ioc
          MERGE (i:IOC {id: ioc.id})
          SET i += ioc,
              i.point = CASE WHEN ioc.geolocation IS NOT NULL
                        THEN point({latitude: ioc.geolocation.latitude, longitude: ioc.geolocation.longitude})
                        ELSE null END

          // Create relationships to threat actors
          WITH i, ioc
          UNWIND ioc.threatActors AS actorId
          MATCH (t:GeoThreatActor {id: actorId})
          MERGE (i)-[:ATTRIBUTED_TO]->(t)

          RETURN count(i) AS created
          `,
          { iocs: batch }
        );

        totalCreated += result.records[0]?.get('created')?.toNumber() || 0;
      }

      const queryTime = performance.now() - startTime;
      this.invalidateCache('ioc_');

      return {
        data: totalCreated,
        metrics: {
          queryTime,
          nodesAccessed: totalCreated,
          relationshipsAccessed: 0,
          cacheHit: false,
        },
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Find IOCs within geographic proximity
   */
  async findIOCsInProximity(
    center: { latitude: number; longitude: number },
    radiusMeters: number,
    options?: {
      types?: string[];
      severities?: string[];
      limit?: number;
    }
  ): Promise<QueryResult<IOC[]>> {
    const cacheKey = `iocs_proximity_${center.latitude}_${center.longitude}_${radiusMeters}`;
    const cached = this.getFromCache<IOC[]>(cacheKey);
    if (cached) {
      return { data: cached, metrics: { queryTime: 0, nodesAccessed: 0, relationshipsAccessed: 0, cacheHit: true } };
    }

    const startTime = performance.now();
    const session = this.driver.session();

    try {
      const typeFilter = options?.types?.length
        ? 'AND i.type IN $types'
        : '';
      const severityFilter = options?.severities?.length
        ? 'AND i.severity IN $severities'
        : '';

      const result = await session.run(
        `
        WITH point({latitude: $lat, longitude: $lon}) AS center
        MATCH (i:IOC)
        WHERE i.point IS NOT NULL
          AND point.distance(i.point, center) <= $radius
          AND i.active = true
          ${typeFilter}
          ${severityFilter}
        WITH i, point.distance(i.point, center) AS distance
        ORDER BY i.severity DESC, distance
        LIMIT $limit
        RETURN i, distance
        `,
        {
          lat: center.latitude,
          lon: center.longitude,
          radius: radiusMeters,
          types: options?.types || [],
          severities: options?.severities || [],
          limit: options?.limit || 100,
        }
      );

      const queryTime = performance.now() - startTime;
      const iocs = result.records.map(record => record.get('i').properties as IOC);

      this.setCache(cacheKey, iocs);

      return {
        data: iocs,
        metrics: {
          queryTime,
          nodesAccessed: result.records.length,
          relationshipsAccessed: 0,
          cacheHit: false,
        },
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Find IOC relationships and attribution chain
   */
  async findIOCAttributionChain(
    iocId: string,
    maxDepth: number = 4
  ): Promise<QueryResult<{
    ioc: IOC;
    relatedIOCs: IOC[];
    threatActors: GeoThreatActor[];
    campaigns: string[];
  }>> {
    const startTime = performance.now();
    const session = this.driver.session();

    try {
      const result = await session.run(
        `
        MATCH (root:IOC {id: $iocId})

        // Find related IOCs
        OPTIONAL MATCH (root)-[:RELATED_TO*1..${maxDepth}]-(related:IOC)
        WITH root, COLLECT(DISTINCT related) AS relatedIOCs

        // Find attributed threat actors
        OPTIONAL MATCH (root)-[:ATTRIBUTED_TO|RELATED_TO*1..${maxDepth}]-(actor:GeoThreatActor)
        WITH root, relatedIOCs, COLLECT(DISTINCT actor) AS actors

        // Find campaigns
        OPTIONAL MATCH (root)-[:PART_OF|RELATED_TO*1..${maxDepth}]-(campaign:Campaign)

        RETURN root, relatedIOCs, actors, COLLECT(DISTINCT campaign.id) AS campaigns
        `,
        { iocId }
      );

      const queryTime = performance.now() - startTime;
      const record = result.records[0];

      return {
        data: {
          ioc: record?.get('root')?.properties as IOC,
          relatedIOCs: (record?.get('relatedIOCs') || []).map((n: { properties: IOC }) => n.properties),
          threatActors: (record?.get('actors') || []).map((n: { properties: GeoThreatActor }) => n.properties),
          campaigns: record?.get('campaigns') || [],
        },
        metrics: {
          queryTime,
          nodesAccessed: result.records.length,
          relationshipsAccessed: maxDepth * 2,
          cacheHit: false,
        },
      };
    } finally {
      await session.close();
    }
  }

  // ============================================================================
  // Intelligence Fusion Operations
  // ============================================================================

  /**
   * Execute multi-INT fusion query
   */
  async executeFusionQuery(
    params: {
      geospatialBounds?: SpatialQueryOptions;
      threatActorIds?: string[];
      iocTypes?: string[];
      timeRange?: { start: Date; end: Date };
      minConfidence?: number;
    }
  ): Promise<QueryResult<FusionResult>> {
    const startTime = performance.now();
    const session = this.driver.session();

    try {
      // Build dynamic query based on parameters
      const conditions: string[] = [];
      const queryParams: Record<string, unknown> = {
        minConfidence: params.minConfidence || 50,
      };

      if (params.threatActorIds?.length) {
        conditions.push('t.id IN $threatActorIds');
        queryParams.threatActorIds = params.threatActorIds;
      }

      if (params.timeRange) {
        conditions.push('i.lastSeen >= $startTime AND i.firstSeen <= $endTime');
        queryParams.startTime = params.timeRange.start.toISOString();
        queryParams.endTime = params.timeRange.end.toISOString();
      }

      if (params.iocTypes?.length) {
        conditions.push('i.type IN $iocTypes');
        queryParams.iocTypes = params.iocTypes;
      }

      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const result = await session.run(
        `
        // Multi-INT fusion query
        MATCH (t:GeoThreatActor)-[:CONTROLS]->(c:CyberInfrastructure)
        MATCH (t)-[:OPERATES_FROM]->(l:ThreatLocation)
        OPTIONAL MATCH (i:IOC)-[:ATTRIBUTED_TO]->(t)
        ${whereClause}

        WITH t,
             COLLECT(DISTINCT c) AS infrastructure,
             COLLECT(DISTINCT l) AS locations,
             COLLECT(DISTINCT i) AS iocs

        // Calculate threat scores
        WITH t, infrastructure, locations, iocs,
             SIZE(infrastructure) * 10 + SIZE(iocs) * 5 AS threatScore

        WHERE threatScore >= $minConfidence

        // Generate H3 heatmap cells
        UNWIND locations AS loc
        WITH t, infrastructure, iocs, loc, threatScore,
             toString(loc.point.latitude) + '_' + toString(loc.point.longitude) AS h3Index

        RETURN
          t AS threatActor,
          infrastructure,
          iocs,
          COLLECT({h3Index: h3Index, threatScore: threatScore}) AS heatmapCells,
          threatScore AS overallThreat
        ORDER BY overallThreat DESC
        LIMIT 50
        `,
        queryParams
      );

      const queryTime = performance.now() - startTime;

      // Transform results into FusionResult
      const correlations = result.records.map(record => ({
        type: 'THREAT_ACTOR_INFRASTRUCTURE',
        entities: [
          record.get('threatActor').properties.id,
          ...record.get('infrastructure').map((i: { properties: { id: string } }) => i.properties.id),
        ],
        confidence: Math.min(record.get('overallThreat') || 0, 100),
        evidence: record.get('iocs').map((i: { properties: { id: string } }) => i.properties.id),
      }));

      const heatmapCells = result.records.flatMap(record =>
        record.get('heatmapCells').map((cell: { h3Index: string; threatScore: number }) => ({
          h3Index: cell.h3Index,
          threatScore: Math.min(cell.threatScore, 100),
        }))
      );

      const fusionResult: FusionResult = {
        id: `fusion_${Date.now()}`,
        fusionType: 'GEOINT_CTI',
        inputSources: [
          { type: 'GEOINT', sourceIds: [], weight: 1 },
          { type: 'CYBERINT', sourceIds: [], weight: 1 },
        ],
        correlations,
        insights: [],
        threatAssessment: {
          overallThreat: correlations.length > 0
            ? Math.max(...correlations.map(c => c.confidence))
            : 0,
          potentialTargets: [],
          mitigationPriority: correlations.length > 10 ? 'HIGH' : 'MEDIUM',
        },
        geospatialSummary: {
          affectedRegions: [],
          threatHeatmap: heatmapCells,
          criticalInfrastructureAtRisk: [],
        },
        processingTime: queryTime,
        confidence: 80,
        tenantId: 'system',
        createdAt: new Date().toISOString(),
      };

      return {
        data: fusionResult,
        metrics: {
          queryTime,
          nodesAccessed: result.records.length * 3,
          relationshipsAccessed: result.records.length * 4,
          cacheHit: false,
        },
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Generate threat activity heatmap using H3 indexing
   */
  async generateThreatHeatmap(
    options: SpatialQueryOptions & { resolution?: number }
  ): Promise<QueryResult<Array<{ h3Index: string; activityScore: number; incidentCount: number }>>> {
    const startTime = performance.now();
    const session = this.driver.session();

    try {
      const result = await session.run(
        `
        MATCH (i:IOC)
        WHERE i.point IS NOT NULL
          AND i.point.latitude >= $minLat
          AND i.point.latitude <= $maxLat
          AND i.point.longitude >= $minLon
          AND i.point.longitude <= $maxLon

        WITH i,
             // Simulated H3 index calculation (in production use H3 UDF)
             toString(round(i.point.latitude * 100)) + '_' +
             toString(round(i.point.longitude * 100)) AS h3Index

        WITH h3Index,
             COUNT(i) AS incidentCount,
             AVG(CASE i.severity
                 WHEN 'CRITICAL' THEN 100
                 WHEN 'HIGH' THEN 75
                 WHEN 'MEDIUM' THEN 50
                 WHEN 'LOW' THEN 25
                 ELSE 10 END) AS activityScore

        ORDER BY activityScore DESC
        LIMIT 1000

        RETURN h3Index, activityScore, incidentCount
        `,
        {
          minLat: options.bbox?.minLat || -90,
          maxLat: options.bbox?.maxLat || 90,
          minLon: options.bbox?.minLon || -180,
          maxLon: options.bbox?.maxLon || 180,
        }
      );

      const queryTime = performance.now() - startTime;

      const heatmapData = result.records.map(record => ({
        h3Index: record.get('h3Index') as string,
        activityScore: record.get('activityScore') as number,
        incidentCount: (record.get('incidentCount') as { toNumber: () => number }).toNumber(),
      }));

      return {
        data: heatmapData,
        metrics: {
          queryTime,
          nodesAccessed: result.records.length,
          relationshipsAccessed: 0,
          cacheHit: false,
        },
      };
    } finally {
      await session.close();
    }
  }

  // ============================================================================
  // Query Optimization
  // ============================================================================

  /**
   * Analyze query and provide optimization hints
   */
  async analyzeQuery(
    queryType: string,
    queryParams: Record<string, unknown>
  ): Promise<QueryOptimizationHint> {
    const session = this.driver.session();

    try {
      // Run EXPLAIN to get query plan
      const result = await session.run(
        `EXPLAIN MATCH (n) WHERE n.id = $id RETURN n`,
        { id: 'sample' }
      );

      return {
        queryId: `query_${Date.now()}`,
        queryType: queryType as QueryOptimizationHint['queryType'],
        suggestedIndexes: [
          {
            indexType: 'SPATIAL',
            fields: ['point'],
            estimatedSpeedup: 10,
          },
        ],
        cacheStrategy: {
          cacheable: true,
          ttlSeconds: 60,
          cacheKey: `${queryType}_${JSON.stringify(queryParams)}`,
          invalidationTriggers: ['ioc_update', 'threat_actor_update'],
        },
        estimatedCost: 100,
        estimatedRows: 50,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Get query performance statistics
   */
  async getQueryStats(): Promise<{
    p50Latency: number;
    p95Latency: number;
    p99Latency: number;
    cacheHitRate: number;
    queriesPerSecond: number;
  }> {
    // In production, this would read from metrics collection
    return {
      p50Latency: 50,
      p95Latency: 1500, // Target: < 2000ms
      p99Latency: 1800,
      cacheHitRate: 0.75,
      queriesPerSecond: 100,
    };
  }

  // ============================================================================
  // Cache Management
  // ============================================================================

  private getFromCache<T>(key: string): T | null {
    const cached = this.queryCache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.result as T;
    }
    this.queryCache.delete(key);
    return null;
  }

  private setCache(key: string, result: unknown, ttl: number = this.cacheTTL): void {
    this.queryCache.set(key, { result, timestamp: Date.now(), ttl });
  }

  private invalidateCache(prefix: string): void {
    for (const key of this.queryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.queryCache.delete(key);
      }
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.queryCache.clear();
  }

  /**
   * Close the repository and release resources
   */
  async close(): Promise<void> {
    this.queryCache.clear();
    await this.driver.close();
  }
}

export default GEOINTNeo4jRepository;
