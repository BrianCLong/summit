/**
 * Neo4j Geospatial Repository
 * Stores and queries geospatial features as graph nodes with spatial indexing
 */

import neo4j, {
  Driver,
  Session,
  Transaction,
  Result,
  Record as Neo4jRecord,
  Integer,
} from 'neo4j-driver';
import { Geometry, Position, Point as GeoJSONPoint } from 'geojson';
import * as turf from '@turf/turf';
import {
  GeoNode,
  GeoNodeType,
  GeoRelationship,
  GeoRelationshipType,
  ExtractedFeature,
  SatelliteScene,
  DetectedChange,
  ChangeDetectionResult,
  ProvenanceRecord,
  BoundingBox,
} from '../types/satellite.js';
import { GeoPoint } from '../types/geospatial.js';

export interface Neo4jConfig {
  uri: string;
  user: string;
  password: string;
  database?: string;
  maxConnectionPoolSize?: number;
  connectionAcquisitionTimeout?: number;
  encrypted?: boolean;
}

export interface SpatialQueryOptions {
  bbox?: BoundingBox;
  maxDistance?: number; // meters from point
  centerPoint?: GeoPoint;
  nodeTypes?: GeoNodeType[];
  minConfidence?: number;
  timeRange?: { start: Date; end: Date };
  limit?: number;
  offset?: number;
  includeRelationships?: boolean;
}

export interface QueryResult<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
  queryTimeMs: number;
}

/**
 * Neo4j Geospatial Repository
 * Provides spatial-aware graph operations for geospatial intelligence data
 */
export class GeoRepository {
  private driver: Driver;
  private database: string;
  private isConnected = false;

  constructor(config: Neo4jConfig) {
    this.driver = neo4j.driver(
      config.uri,
      neo4j.auth.basic(config.user, config.password),
      {
        maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
        maxConnectionPoolSize: config.maxConnectionPoolSize ?? 50,
        connectionAcquisitionTimeout: config.connectionAcquisitionTimeout ?? 60000,
        disableLosslessIntegers: true,
        encrypted: config.encrypted ? 'ENCRYPTION_ON' : 'ENCRYPTION_OFF',
      }
    );
    this.database = config.database ?? 'neo4j';
  }

  /**
   * Connect and initialize schema
   */
  async connect(): Promise<void> {
    if (this.isConnected) return;

    await this.driver.verifyConnectivity();
    await this.initializeSchema();
    this.isConnected = true;
  }

  /**
   * Initialize Neo4j schema with spatial indexes and constraints
   */
  private async initializeSchema(): Promise<void> {
    const session = this.getSession();

    try {
      // Constraints for unique IDs
      const constraints = [
        'CREATE CONSTRAINT geo_node_id IF NOT EXISTS FOR (n:GeoNode) REQUIRE n.nodeId IS UNIQUE',
        'CREATE CONSTRAINT scene_id IF NOT EXISTS FOR (s:SatelliteScene) REQUIRE s.sceneId IS UNIQUE',
        'CREATE CONSTRAINT change_id IF NOT EXISTS FOR (c:ChangeEvent) REQUIRE c.changeId IS UNIQUE',
        'CREATE CONSTRAINT provenance_id IF NOT EXISTS FOR (p:Provenance) REQUIRE p.provenanceId IS UNIQUE',
      ];

      for (const constraint of constraints) {
        try {
          await session.run(constraint);
        } catch (error: any) {
          if (!error.message?.includes('already exists')) {
            console.warn(`Failed to create constraint: ${error.message}`);
          }
        }
      }

      // Indexes for efficient querying
      const indexes = [
        // Spatial index using point type
        'CREATE POINT INDEX geo_node_location IF NOT EXISTS FOR (n:GeoNode) ON (n.location)',
        // Composite indexes for common queries
        'CREATE INDEX geo_node_type_confidence IF NOT EXISTS FOR (n:GeoNode) ON (n.nodeType, n.confidence)',
        'CREATE INDEX geo_node_observed IF NOT EXISTS FOR (n:GeoNode) ON (n.lastObserved)',
        'CREATE INDEX scene_acquisition IF NOT EXISTS FOR (s:SatelliteScene) ON (s.acquisitionDate)',
        'CREATE INDEX scene_platform IF NOT EXISTS FOR (s:SatelliteScene) ON (s.platform)',
        'CREATE INDEX change_type IF NOT EXISTS FOR (c:ChangeEvent) ON (c.changeType)',
        'CREATE INDEX change_confidence IF NOT EXISTS FOR (c:ChangeEvent) ON (c.confidence)',
      ];

      for (const index of indexes) {
        try {
          await session.run(index);
        } catch (error: any) {
          if (!error.message?.includes('already exists')) {
            console.warn(`Failed to create index: ${error.message}`);
          }
        }
      }
    } finally {
      await session.close();
    }
  }

  /**
   * Get a new session
   */
  private getSession(): Session {
    return this.driver.session({
      database: this.database,
      defaultAccessMode: neo4j.session.WRITE,
    });
  }

  /**
   * Create or update a GeoNode from an extracted feature
   */
  async upsertGeoNode(
    feature: ExtractedFeature,
    nodeType: GeoNodeType,
    provenance: ProvenanceRecord
  ): Promise<GeoNode> {
    const session = this.getSession();

    try {
      const centroid = turf.centroid(feature);
      const bbox = turf.bbox(feature);

      const nodeId = feature.properties.entityId ||
        `geo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const query = `
        MERGE (p:Provenance {provenanceId: $provenanceId})
        ON CREATE SET
          p.source = $provenanceSource,
          p.method = $provenanceMethod,
          p.timestamp = datetime($provenanceTimestamp),
          p.pipeline = $provenancePipeline

        WITH p

        MERGE (n:GeoNode {nodeId: $nodeId})
        ON CREATE SET
          n.nodeType = $nodeType,
          n.location = point({longitude: $centroidLon, latitude: $centroidLat}),
          n.geometry = $geometry,
          n.bboxMinLon = $bboxMinLon,
          n.bboxMinLat = $bboxMinLat,
          n.bboxMaxLon = $bboxMaxLon,
          n.bboxMaxLat = $bboxMaxLat,
          n.properties = $properties,
          n.confidence = $confidence,
          n.firstObserved = datetime($timestamp),
          n.lastObserved = datetime($timestamp),
          n.observationCount = 1,
          n.classification = $classification,
          n.sceneIds = [$sceneId]
        ON MATCH SET
          n.lastObserved = datetime($timestamp),
          n.observationCount = n.observationCount + 1,
          n.confidence = CASE
            WHEN $confidence > n.confidence THEN $confidence
            ELSE n.confidence
          END,
          n.sceneIds = CASE
            WHEN NOT $sceneId IN n.sceneIds THEN n.sceneIds + $sceneId
            ELSE n.sceneIds
          END

        WITH n, p
        MERGE (n)-[:HAS_PROVENANCE]->(p)

        RETURN n.nodeId as nodeId,
               n.nodeType as nodeType,
               n.geometry as geometry,
               n.location.longitude as centroidLon,
               n.location.latitude as centroidLat,
               n.bboxMinLon as bboxMinLon,
               n.bboxMinLat as bboxMinLat,
               n.bboxMaxLon as bboxMaxLon,
               n.bboxMaxLat as bboxMaxLat,
               n.properties as properties,
               n.sceneIds as sceneIds,
               n.confidence as confidence,
               n.firstObserved as firstObserved,
               n.lastObserved as lastObserved,
               n.observationCount as observationCount,
               n.classification as classification
      `;

      const result = await session.run(query, {
        nodeId,
        nodeType,
        centroidLon: centroid.geometry.coordinates[0],
        centroidLat: centroid.geometry.coordinates[1],
        geometry: JSON.stringify(feature.geometry),
        bboxMinLon: bbox[0],
        bboxMinLat: bbox[1],
        bboxMaxLon: bbox[2],
        bboxMaxLat: bbox[3],
        properties: JSON.stringify(feature.properties),
        confidence: feature.properties.detectionConfidence ?? 1.0,
        timestamp: new Date().toISOString(),
        classification: feature.properties.classification ?? 'unclassified',
        sceneId: feature.properties.sceneId ?? '',
        provenanceId: provenance.id,
        provenanceSource: provenance.source,
        provenanceMethod: provenance.method,
        provenanceTimestamp: provenance.timestamp.toISOString(),
        provenancePipeline: provenance.pipeline ?? '',
      });

      const record = result.records[0];

      return {
        nodeId: record.get('nodeId'),
        nodeType: record.get('nodeType'),
        geometry: JSON.parse(record.get('geometry')),
        centroid: [record.get('centroidLon'), record.get('centroidLat')],
        bbox: {
          minLon: record.get('bboxMinLon'),
          minLat: record.get('bboxMinLat'),
          maxLon: record.get('bboxMaxLon'),
          maxLat: record.get('bboxMaxLat'),
        },
        properties: JSON.parse(record.get('properties')),
        sceneIds: record.get('sceneIds'),
        confidence: record.get('confidence'),
        firstObserved: new Date(record.get('firstObserved').toString()),
        lastObserved: new Date(record.get('lastObserved').toString()),
        observationCount: record.get('observationCount'),
        classification: record.get('classification'),
        provenance,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Bulk upsert multiple features
   */
  async bulkUpsertGeoNodes(
    features: ExtractedFeature[],
    nodeType: GeoNodeType,
    provenance: ProvenanceRecord,
    batchSize = 100
  ): Promise<{ created: number; updated: number; errors: number }> {
    let created = 0;
    let updated = 0;
    let errors = 0;

    // Process in batches
    for (let i = 0; i < features.length; i += batchSize) {
      const batch = features.slice(i, i + batchSize);
      const session = this.getSession();
      const tx = session.beginTransaction();

      try {
        for (const feature of batch) {
          try {
            await this.upsertGeoNode(feature, nodeType, provenance);
            // We don't have a clean way to distinguish create vs update here
            created++;
          } catch (error) {
            errors++;
          }
        }
        await tx.commit();
      } catch (error) {
        await tx.rollback();
        errors += batch.length;
      } finally {
        await session.close();
      }
    }

    return { created, updated, errors };
  }

  /**
   * Create a satellite scene node
   */
  async upsertSatelliteScene(scene: SatelliteScene): Promise<void> {
    const session = this.getSession();

    try {
      const query = `
        MERGE (s:SatelliteScene {sceneId: $sceneId})
        ON CREATE SET
          s.platform = $platform,
          s.sensor = $sensor,
          s.acquisitionDate = datetime($acquisitionDate),
          s.processingLevel = $processingLevel,
          s.gsd = $gsd,
          s.cloudCoverPercent = $cloudCoverPercent,
          s.classification = $classification,
          s.bbox = point({longitude: $centerLon, latitude: $centerLat}),
          s.bboxMinLon = $bboxMinLon,
          s.bboxMinLat = $bboxMinLat,
          s.bboxMaxLon = $bboxMaxLon,
          s.bboxMaxLat = $bboxMaxLat,
          s.ingestTimestamp = datetime($ingestTimestamp),
          s.source = $source,
          s.localPath = $localPath
        ON MATCH SET
          s.processingLevel = $processingLevel,
          s.localPath = $localPath
      `;

      const centerLon = (scene.bbox.minLon + scene.bbox.maxLon) / 2;
      const centerLat = (scene.bbox.minLat + scene.bbox.maxLat) / 2;

      await session.run(query, {
        sceneId: scene.id,
        platform: scene.platform,
        sensor: scene.sensor,
        acquisitionDate: scene.acquisitionDate.toISOString(),
        processingLevel: scene.processingLevel,
        gsd: scene.gsd,
        cloudCoverPercent: scene.cloudCoverPercent,
        classification: scene.classification,
        centerLon,
        centerLat,
        bboxMinLon: scene.bbox.minLon,
        bboxMinLat: scene.bbox.minLat,
        bboxMaxLon: scene.bbox.maxLon,
        bboxMaxLat: scene.bbox.maxLat,
        ingestTimestamp: scene.ingestTimestamp.toISOString(),
        source: scene.source,
        localPath: scene.localPath ?? '',
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Create a relationship between geo nodes
   */
  async createRelationship(
    sourceNodeId: string,
    targetNodeId: string,
    relationshipType: GeoRelationshipType,
    properties: Record<string, unknown> = {},
    confidence = 1.0
  ): Promise<GeoRelationship> {
    const session = this.getSession();

    try {
      const relationshipId = `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const query = `
        MATCH (source:GeoNode {nodeId: $sourceNodeId})
        MATCH (target:GeoNode {nodeId: $targetNodeId})
        CREATE (source)-[r:${relationshipType.toUpperCase()} {
          relationshipId: $relationshipId,
          properties: $properties,
          confidence: $confidence,
          observedAt: datetime($observedAt)
        }]->(target)
        RETURN r.relationshipId as relationshipId,
               type(r) as relationshipType,
               $sourceNodeId as sourceNodeId,
               $targetNodeId as targetNodeId,
               r.properties as properties,
               r.confidence as confidence,
               r.observedAt as observedAt
      `;

      const result = await session.run(query, {
        sourceNodeId,
        targetNodeId,
        relationshipId,
        properties: JSON.stringify(properties),
        confidence,
        observedAt: new Date().toISOString(),
      });

      const record = result.records[0];

      return {
        relationshipId: record.get('relationshipId'),
        relationshipType: record.get('relationshipType').toLowerCase() as GeoRelationshipType,
        sourceNodeId: record.get('sourceNodeId'),
        targetNodeId: record.get('targetNodeId'),
        properties: JSON.parse(record.get('properties')),
        confidence: record.get('confidence'),
        observedAt: new Date(record.get('observedAt').toString()),
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Automatically create spatial relationships based on geometry
   */
  async createSpatialRelationships(
    nodeId: string,
    maxDistanceMeters = 1000
  ): Promise<GeoRelationship[]> {
    const session = this.getSession();

    try {
      // Find nearby nodes and create relationships
      const query = `
        MATCH (n:GeoNode {nodeId: $nodeId})
        MATCH (other:GeoNode)
        WHERE other.nodeId <> n.nodeId
          AND point.distance(n.location, other.location) < $maxDistance
        WITH n, other, point.distance(n.location, other.location) as distance
        MERGE (n)-[r:NEAR {distance: distance}]->(other)
        ON CREATE SET
          r.relationshipId = 'near_' + n.nodeId + '_' + other.nodeId,
          r.confidence = 1.0 - (distance / $maxDistance),
          r.observedAt = datetime()
        RETURN r.relationshipId as relationshipId,
               'near' as relationshipType,
               n.nodeId as sourceNodeId,
               other.nodeId as targetNodeId,
               r.distance as distance,
               r.confidence as confidence,
               r.observedAt as observedAt
      `;

      const result = await session.run(query, {
        nodeId,
        maxDistance: maxDistanceMeters,
      });

      return result.records.map((record) => ({
        relationshipId: record.get('relationshipId'),
        relationshipType: 'near' as GeoRelationshipType,
        sourceNodeId: record.get('sourceNodeId'),
        targetNodeId: record.get('targetNodeId'),
        properties: { distance: record.get('distance') },
        confidence: record.get('confidence'),
        observedAt: new Date(record.get('observedAt').toString()),
      }));
    } finally {
      await session.close();
    }
  }

  /**
   * Store change detection result as graph nodes
   */
  async storeChangeDetectionResult(result: ChangeDetectionResult): Promise<void> {
    const session = this.getSession();
    const tx = session.beginTransaction();

    try {
      // Create change detection run node
      await tx.run(`
        CREATE (cdr:ChangeDetectionRun {
          id: $id,
          beforeSceneId: $beforeSceneId,
          afterSceneId: $afterSceneId,
          method: $method,
          detectionTimestamp: datetime($detectionTimestamp),
          overallConfidence: $overallConfidence,
          processingTimeMs: $processingTimeMs,
          changeCount: $changeCount
        })
      `, {
        id: result.id,
        beforeSceneId: result.beforeSceneId,
        afterSceneId: result.afterSceneId,
        method: result.method,
        detectionTimestamp: result.detectionTimestamp.toISOString(),
        overallConfidence: result.overallConfidence,
        processingTimeMs: result.processingTimeMs,
        changeCount: result.changes.length,
      });

      // Create individual change nodes
      for (const change of result.changes) {
        const centroid = turf.centroid(change.geometry);

        await tx.run(`
          MATCH (cdr:ChangeDetectionRun {id: $runId})
          CREATE (c:ChangeEvent {
            changeId: $changeId,
            changeType: $changeType,
            location: point({longitude: $lon, latitude: $lat}),
            geometry: $geometry,
            areaSqMeters: $areaSqMeters,
            confidence: $confidence,
            magnitudeScore: $magnitudeScore,
            description: $description
          })
          CREATE (cdr)-[:DETECTED]->(c)
        `, {
          runId: result.id,
          changeId: change.id,
          changeType: change.type,
          lon: centroid.geometry.coordinates[0],
          lat: centroid.geometry.coordinates[1],
          geometry: JSON.stringify(change.geometry),
          areaSqMeters: change.areaSqMeters,
          confidence: change.confidence,
          magnitudeScore: change.magnitudeScore,
          description: change.description ?? '',
        });

        // Link to existing entity if specified
        if (change.linkedEntityId) {
          await tx.run(`
            MATCH (c:ChangeEvent {changeId: $changeId})
            MATCH (n:GeoNode {nodeId: $entityId})
            CREATE (c)-[:AFFECTS]->(n)
          `, {
            changeId: change.id,
            entityId: change.linkedEntityId,
          });
        }
      }

      // Link to scenes
      await tx.run(`
        MATCH (cdr:ChangeDetectionRun {id: $runId})
        MATCH (before:SatelliteScene {sceneId: $beforeSceneId})
        MATCH (after:SatelliteScene {sceneId: $afterSceneId})
        CREATE (cdr)-[:USES_BEFORE]->(before)
        CREATE (cdr)-[:USES_AFTER]->(after)
      `, {
        runId: result.id,
        beforeSceneId: result.beforeSceneId,
        afterSceneId: result.afterSceneId,
      });

      await tx.commit();
    } catch (error) {
      await tx.rollback();
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Query nodes within bounding box
   */
  async queryByBbox(
    bbox: BoundingBox,
    options: SpatialQueryOptions = {}
  ): Promise<QueryResult<GeoNode>> {
    const session = this.getSession();
    const startTime = Date.now();

    try {
      let whereClause = `
        n.bboxMinLon >= $minLon AND n.bboxMaxLon <= $maxLon
        AND n.bboxMinLat >= $minLat AND n.bboxMaxLat <= $maxLat
      `;

      if (options.nodeTypes && options.nodeTypes.length > 0) {
        whereClause += ` AND n.nodeType IN $nodeTypes`;
      }

      if (options.minConfidence !== undefined) {
        whereClause += ` AND n.confidence >= $minConfidence`;
      }

      if (options.timeRange) {
        whereClause += ` AND n.lastObserved >= datetime($timeStart) AND n.lastObserved <= datetime($timeEnd)`;
      }

      const query = `
        MATCH (n:GeoNode)
        WHERE ${whereClause}
        RETURN n
        ORDER BY n.confidence DESC, n.lastObserved DESC
        SKIP $offset
        LIMIT $limit
      `;

      const countQuery = `
        MATCH (n:GeoNode)
        WHERE ${whereClause}
        RETURN count(n) as total
      `;

      const [dataResult, countResult] = await Promise.all([
        session.run(query, {
          minLon: bbox.minLon,
          maxLon: bbox.maxLon,
          minLat: bbox.minLat,
          maxLat: bbox.maxLat,
          nodeTypes: options.nodeTypes ?? [],
          minConfidence: options.minConfidence ?? 0,
          timeStart: options.timeRange?.start.toISOString() ?? '1970-01-01T00:00:00Z',
          timeEnd: options.timeRange?.end.toISOString() ?? '2100-01-01T00:00:00Z',
          offset: options.offset ?? 0,
          limit: options.limit ?? 100,
        }),
        session.run(countQuery, {
          minLon: bbox.minLon,
          maxLon: bbox.maxLon,
          minLat: bbox.minLat,
          maxLat: bbox.maxLat,
          nodeTypes: options.nodeTypes ?? [],
          minConfidence: options.minConfidence ?? 0,
          timeStart: options.timeRange?.start.toISOString() ?? '1970-01-01T00:00:00Z',
          timeEnd: options.timeRange?.end.toISOString() ?? '2100-01-01T00:00:00Z',
        }),
      ]);

      const items = dataResult.records.map((record) => this.recordToGeoNode(record.get('n')));
      const totalCount = countResult.records[0].get('total').toNumber();

      return {
        items,
        totalCount,
        hasMore: (options.offset ?? 0) + items.length < totalCount,
        queryTimeMs: Date.now() - startTime,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Query nodes near a point
   */
  async queryNearPoint(
    point: GeoPoint,
    maxDistanceMeters: number,
    options: SpatialQueryOptions = {}
  ): Promise<QueryResult<GeoNode>> {
    const session = this.getSession();
    const startTime = Date.now();

    try {
      let whereClause = `
        point.distance(n.location, point({longitude: $lon, latitude: $lat})) <= $maxDistance
      `;

      if (options.nodeTypes && options.nodeTypes.length > 0) {
        whereClause += ` AND n.nodeType IN $nodeTypes`;
      }

      if (options.minConfidence !== undefined) {
        whereClause += ` AND n.confidence >= $minConfidence`;
      }

      const query = `
        MATCH (n:GeoNode)
        WHERE ${whereClause}
        WITH n, point.distance(n.location, point({longitude: $lon, latitude: $lat})) as distance
        RETURN n, distance
        ORDER BY distance ASC
        SKIP $offset
        LIMIT $limit
      `;

      const result = await session.run(query, {
        lon: point.longitude,
        lat: point.latitude,
        maxDistance: maxDistanceMeters,
        nodeTypes: options.nodeTypes ?? [],
        minConfidence: options.minConfidence ?? 0,
        offset: options.offset ?? 0,
        limit: options.limit ?? 100,
      });

      const items = result.records.map((record) => this.recordToGeoNode(record.get('n')));

      return {
        items,
        totalCount: items.length,
        hasMore: items.length === (options.limit ?? 100),
        queryTimeMs: Date.now() - startTime,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Get changes for an area
   */
  async getChangesInArea(
    bbox: BoundingBox,
    timeRange?: { start: Date; end: Date },
    changeTypes?: string[]
  ): Promise<DetectedChange[]> {
    const session = this.getSession();

    try {
      let whereClause = `
        point.distance(c.location, point({longitude: $centerLon, latitude: $centerLat})) <= $maxDistance
      `;

      if (timeRange) {
        whereClause += ` AND cdr.detectionTimestamp >= datetime($timeStart) AND cdr.detectionTimestamp <= datetime($timeEnd)`;
      }

      if (changeTypes && changeTypes.length > 0) {
        whereClause += ` AND c.changeType IN $changeTypes`;
      }

      const centerLon = (bbox.minLon + bbox.maxLon) / 2;
      const centerLat = (bbox.minLat + bbox.maxLat) / 2;
      const maxDistance = turf.distance(
        [bbox.minLon, bbox.minLat],
        [bbox.maxLon, bbox.maxLat],
        { units: 'meters' }
      ) / 2;

      const query = `
        MATCH (cdr:ChangeDetectionRun)-[:DETECTED]->(c:ChangeEvent)
        WHERE ${whereClause}
        RETURN c
        ORDER BY c.confidence DESC
        LIMIT 1000
      `;

      const result = await session.run(query, {
        centerLon,
        centerLat,
        maxDistance,
        timeStart: timeRange?.start.toISOString() ?? '1970-01-01T00:00:00Z',
        timeEnd: timeRange?.end.toISOString() ?? '2100-01-01T00:00:00Z',
        changeTypes: changeTypes ?? [],
      });

      return result.records.map((record) => {
        const c = record.get('c').properties;
        return {
          id: c.changeId,
          type: c.changeType,
          geometry: JSON.parse(c.geometry),
          centroid: { longitude: c.location.x, latitude: c.location.y },
          areaSqMeters: c.areaSqMeters,
          confidence: c.confidence,
          magnitudeScore: c.magnitudeScore,
          description: c.description,
        };
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Get node by ID with relationships
   */
  async getNodeWithRelationships(nodeId: string): Promise<{
    node: GeoNode;
    relationships: GeoRelationship[];
    relatedNodes: GeoNode[];
  } | null> {
    const session = this.getSession();

    try {
      const query = `
        MATCH (n:GeoNode {nodeId: $nodeId})
        OPTIONAL MATCH (n)-[r]-(related:GeoNode)
        RETURN n, collect(DISTINCT r) as relationships, collect(DISTINCT related) as relatedNodes
      `;

      const result = await session.run(query, { nodeId });

      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0];
      const node = this.recordToGeoNode(record.get('n'));

      const relationships: GeoRelationship[] = record.get('relationships')
        .filter((r: any) => r !== null)
        .map((r: any) => ({
          relationshipId: r.properties.relationshipId ?? '',
          relationshipType: r.type.toLowerCase() as GeoRelationshipType,
          sourceNodeId: r.startNodeElementId,
          targetNodeId: r.endNodeElementId,
          properties: r.properties,
          confidence: r.properties.confidence ?? 1.0,
          observedAt: r.properties.observedAt ? new Date(r.properties.observedAt.toString()) : new Date(),
        }));

      const relatedNodes = record.get('relatedNodes')
        .filter((n: any) => n !== null)
        .map((n: any) => this.recordToGeoNode(n));

      return { node, relationships, relatedNodes };
    } finally {
      await session.close();
    }
  }

  /**
   * Convert Neo4j record to GeoNode
   */
  private recordToGeoNode(nodeRecord: any): GeoNode {
    const props = nodeRecord.properties;

    return {
      nodeId: props.nodeId,
      nodeType: props.nodeType,
      geometry: JSON.parse(props.geometry),
      centroid: [props.location.x, props.location.y],
      bbox: {
        minLon: props.bboxMinLon,
        minLat: props.bboxMinLat,
        maxLon: props.bboxMaxLon,
        maxLat: props.bboxMaxLat,
      },
      properties: JSON.parse(props.properties),
      sceneIds: props.sceneIds,
      confidence: props.confidence,
      firstObserved: new Date(props.firstObserved.toString()),
      lastObserved: new Date(props.lastObserved.toString()),
      observationCount: props.observationCount,
      classification: props.classification,
      provenance: {
        id: '',
        source: '',
        method: '',
        timestamp: new Date(),
        inputIds: [],
      },
    };
  }

  /**
   * Get health status
   */
  async healthCheck(): Promise<{ healthy: boolean; latencyMs: number }> {
    const startTime = Date.now();

    try {
      const session = this.getSession();
      await session.run('RETURN 1');
      await session.close();

      return {
        healthy: true,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        healthy: false,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    if (this.isConnected) {
      await this.driver.close();
      this.isConnected = false;
    }
  }
}

/**
 * Factory for creating GeoRepository instances
 */
export function createGeoRepository(config: Neo4jConfig): GeoRepository {
  return new GeoRepository(config);
}
