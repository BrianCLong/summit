/**
 * Geo-Temporal Graph Repository
 *
 * Abstraction layer for fetching geo-temporal observations from graph database.
 * Primary implementation uses Neo4j, but interface allows for other backends.
 */

import type { Driver, Session } from 'neo4j-driver';
import {
  GeoObservation,
  TimeRange,
  EntityType,
  Location,
  GeoTemporalQueryOptions,
} from '../types/geotemporal.js';

/**
 * Repository interface for geo-temporal data
 */
export interface IGeoGraphRepository {
  /**
   * Get all observations for a single entity
   */
  getObservationsForEntity(entityId: string, timeRange?: TimeRange): Promise<GeoObservation[]>;

  /**
   * Get observations for multiple entities
   */
  getObservationsForEntities(
    entityIds: string[],
    timeRange?: TimeRange,
  ): Promise<GeoObservation[]>;

  /**
   * Query observations with advanced filters
   */
  queryObservations(options: GeoTemporalQueryOptions): Promise<GeoObservation[]>;

  /**
   * Store/upsert a geo-observation
   */
  upsertObservation(observation: GeoObservation): Promise<void>;

  /**
   * Batch upsert observations
   */
  batchUpsertObservations(observations: GeoObservation[]): Promise<void>;
}

/**
 * Neo4j implementation of GeoGraphRepository
 *
 * Graph model:
 * - Nodes: (Entity), (Location), (Observation)
 * - Relationships:
 *   - (:Entity)-[:OBSERVED_AT]->(:Observation)
 *   - (:Observation)-[:AT_LOCATION]->(:Location)
 */
export class Neo4jGeoGraphRepository implements IGeoGraphRepository {
  constructor(private driver: Driver, private database: string = 'neo4j') {}

  private getSession(): Session {
    return this.driver.session({ database: this.database });
  }

  async getObservationsForEntity(
    entityId: string,
    timeRange?: TimeRange,
  ): Promise<GeoObservation[]> {
    return this.getObservationsForEntities([entityId], timeRange);
  }

  async getObservationsForEntities(
    entityIds: string[],
    timeRange?: TimeRange,
  ): Promise<GeoObservation[]> {
    const session = this.getSession();

    try {
      let query = `
        MATCH (e:Entity)-[:OBSERVED_AT]->(obs:Observation)-[:AT_LOCATION]->(loc:Location)
        WHERE e.entityId IN $entityIds
      `;

      const params: Record<string, any> = {
        entityIds,
      };

      // Add time range filters
      if (timeRange?.from) {
        query += ` AND datetime(obs.startTime) >= datetime($fromTime)`;
        params.fromTime = timeRange.from;
      }

      if (timeRange?.to) {
        query += ` AND datetime(obs.endTime) <= datetime($toTime)`;
        params.toTime = timeRange.to;
      }

      query += `
        RETURN obs.id as obsId,
               e.entityId as entityId,
               e.entityType as entityType,
               obs.startTime as startTime,
               obs.endTime as endTime,
               obs.sourceSystem as sourceSystem,
               obs.confidence as confidence,
               obs.tags as tags,
               obs.metadata as metadata,
               loc.id as locationId,
               loc.latitude as latitude,
               loc.longitude as longitude,
               loc.name as locationName,
               loc.countryCode as countryCode,
               loc.city as city,
               loc.accuracyMeters as accuracyMeters,
               loc.elevation as elevation
        ORDER BY obs.startTime ASC
      `;

      const result = await session.run(query, params);

      return result.records.map((record) => this.recordToObservation(record));
    } finally {
      await session.close();
    }
  }

  async queryObservations(options: GeoTemporalQueryOptions): Promise<GeoObservation[]> {
    const session = this.getSession();

    try {
      let query = `
        MATCH (e:Entity)-[:OBSERVED_AT]->(obs:Observation)-[:AT_LOCATION]->(loc:Location)
        WHERE 1=1
      `;

      const params: Record<string, any> = {};

      // Entity filters
      if (options.entityIds && options.entityIds.length > 0) {
        query += ` AND e.entityId IN $entityIds`;
        params.entityIds = options.entityIds;
      }

      if (options.entityTypes && options.entityTypes.length > 0) {
        query += ` AND e.entityType IN $entityTypes`;
        params.entityTypes = options.entityTypes;
      }

      // Time range filters
      if (options.timeRange?.from) {
        query += ` AND datetime(obs.startTime) >= datetime($fromTime)`;
        params.fromTime = options.timeRange.from;
      }

      if (options.timeRange?.to) {
        query += ` AND datetime(obs.endTime) <= datetime($toTime)`;
        params.toTime = options.timeRange.to;
      }

      // Bounding box filter
      if (options.boundingBox) {
        query += `
          AND loc.latitude >= $minLat
          AND loc.latitude <= $maxLat
          AND loc.longitude >= $minLon
          AND loc.longitude <= $maxLon
        `;
        params.minLat = options.boundingBox.minLat;
        params.maxLat = options.boundingBox.maxLat;
        params.minLon = options.boundingBox.minLon;
        params.maxLon = options.boundingBox.maxLon;
      }

      query += `
        RETURN obs.id as obsId,
               e.entityId as entityId,
               e.entityType as entityType,
               obs.startTime as startTime,
               obs.endTime as endTime,
               obs.sourceSystem as sourceSystem,
               obs.confidence as confidence,
               obs.tags as tags,
               obs.metadata as metadata,
               loc.id as locationId,
               loc.latitude as latitude,
               loc.longitude as longitude,
               loc.name as locationName,
               loc.countryCode as countryCode,
               loc.city as city,
               loc.accuracyMeters as accuracyMeters,
               loc.elevation as elevation
        ORDER BY obs.startTime ASC
      `;

      // Pagination
      if (options.limit) {
        query += ` LIMIT $limit`;
        params.limit = options.limit;
      }

      if (options.offset) {
        query += ` SKIP $offset`;
        params.offset = options.offset;
      }

      const result = await session.run(query, params);

      return result.records.map((record) => this.recordToObservation(record));
    } finally {
      await session.close();
    }
  }

  async upsertObservation(observation: GeoObservation): Promise<void> {
    return this.batchUpsertObservations([observation]);
  }

  async batchUpsertObservations(observations: GeoObservation[]): Promise<void> {
    const session = this.getSession();

    try {
      const tx = session.beginTransaction();

      try {
        for (const obs of observations) {
          const query = `
            // Create or merge Entity
            MERGE (e:Entity {entityId: $entityId})
            ON CREATE SET
              e.entityType = $entityType,
              e.createdAt = datetime()
            ON MATCH SET
              e.updatedAt = datetime()

            // Create or merge Location
            WITH e
            MERGE (loc:Location {id: $locationId})
            ON CREATE SET
              loc.latitude = $latitude,
              loc.longitude = $longitude,
              loc.name = $locationName,
              loc.countryCode = $countryCode,
              loc.city = $city,
              loc.accuracyMeters = $accuracyMeters,
              loc.elevation = $elevation,
              loc.createdAt = datetime()
            ON MATCH SET
              loc.latitude = $latitude,
              loc.longitude = $longitude,
              loc.updatedAt = datetime()

            // Create or merge Observation
            WITH e, loc
            MERGE (obs:Observation {id: $obsId})
            ON CREATE SET
              obs.startTime = $startTime,
              obs.endTime = $endTime,
              obs.sourceSystem = $sourceSystem,
              obs.confidence = $confidence,
              obs.tags = $tags,
              obs.metadata = $metadata,
              obs.createdAt = datetime()
            ON MATCH SET
              obs.startTime = $startTime,
              obs.endTime = $endTime,
              obs.sourceSystem = $sourceSystem,
              obs.confidence = $confidence,
              obs.tags = $tags,
              obs.metadata = $metadata,
              obs.updatedAt = datetime()

            // Create relationships
            WITH e, obs, loc
            MERGE (e)-[:OBSERVED_AT]->(obs)
            MERGE (obs)-[:AT_LOCATION]->(loc)
          `;

          const params = {
            entityId: obs.entityId,
            entityType: obs.entityType,
            obsId: obs.id,
            startTime: obs.startTime,
            endTime: obs.endTime,
            sourceSystem: obs.sourceSystem || null,
            confidence: obs.confidence || null,
            tags: obs.tags || [],
            metadata: obs.metadata || {},
            locationId: obs.location.id,
            latitude: obs.location.latitude,
            longitude: obs.location.longitude,
            locationName: obs.location.name || null,
            countryCode: obs.location.countryCode || null,
            city: obs.location.city || null,
            accuracyMeters: obs.location.accuracyMeters || null,
            elevation: obs.location.elevation || null,
          };

          await tx.run(query, params);
        }

        await tx.commit();
      } catch (error) {
        await tx.rollback();
        throw error;
      }
    } finally {
      await session.close();
    }
  }

  private recordToObservation(record: any): GeoObservation {
    const location: Location = {
      id: record.get('locationId'),
      latitude: record.get('latitude'),
      longitude: record.get('longitude'),
      name: record.get('locationName'),
      countryCode: record.get('countryCode'),
      city: record.get('city'),
      accuracyMeters: record.get('accuracyMeters'),
      elevation: record.get('elevation'),
    };

    return {
      id: record.get('obsId'),
      entityId: record.get('entityId'),
      entityType: record.get('entityType') as EntityType,
      location,
      startTime: record.get('startTime'),
      endTime: record.get('endTime'),
      sourceSystem: record.get('sourceSystem'),
      confidence: record.get('confidence'),
      tags: record.get('tags') || [],
      metadata: record.get('metadata') || {},
    };
  }
}

/**
 * In-memory implementation for testing
 */
export class InMemoryGeoGraphRepository implements IGeoGraphRepository {
  private observations: GeoObservation[] = [];

  async getObservationsForEntity(
    entityId: string,
    timeRange?: TimeRange,
  ): Promise<GeoObservation[]> {
    return this.getObservationsForEntities([entityId], timeRange);
  }

  async getObservationsForEntities(
    entityIds: string[],
    timeRange?: TimeRange,
  ): Promise<GeoObservation[]> {
    let filtered = this.observations.filter((obs) => entityIds.includes(obs.entityId));

    if (timeRange?.from) {
      const fromTime = new Date(timeRange.from).getTime();
      filtered = filtered.filter((obs) => new Date(obs.startTime).getTime() >= fromTime);
    }

    if (timeRange?.to) {
      const toTime = new Date(timeRange.to).getTime();
      filtered = filtered.filter((obs) => new Date(obs.endTime).getTime() <= toTime);
    }

    return filtered.sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
  }

  async queryObservations(options: GeoTemporalQueryOptions): Promise<GeoObservation[]> {
    let filtered = [...this.observations];

    if (options.entityIds && options.entityIds.length > 0) {
      filtered = filtered.filter((obs) => options.entityIds!.includes(obs.entityId));
    }

    if (options.entityTypes && options.entityTypes.length > 0) {
      filtered = filtered.filter((obs) => options.entityTypes!.includes(obs.entityType));
    }

    if (options.timeRange?.from) {
      const fromTime = new Date(options.timeRange.from).getTime();
      filtered = filtered.filter((obs) => new Date(obs.startTime).getTime() >= fromTime);
    }

    if (options.timeRange?.to) {
      const toTime = new Date(options.timeRange.to).getTime();
      filtered = filtered.filter((obs) => new Date(obs.endTime).getTime() <= toTime);
    }

    if (options.boundingBox) {
      const { minLat, maxLat, minLon, maxLon } = options.boundingBox;
      filtered = filtered.filter(
        (obs) =>
          obs.location.latitude >= minLat &&
          obs.location.latitude <= maxLat &&
          obs.location.longitude >= minLon &&
          obs.location.longitude <= maxLon,
      );
    }

    // Sort
    filtered.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    // Pagination
    const offset = options.offset || 0;
    const limit = options.limit || filtered.length;

    return filtered.slice(offset, offset + limit);
  }

  async upsertObservation(observation: GeoObservation): Promise<void> {
    const index = this.observations.findIndex((obs) => obs.id === observation.id);
    if (index >= 0) {
      this.observations[index] = observation;
    } else {
      this.observations.push(observation);
    }
  }

  async batchUpsertObservations(observations: GeoObservation[]): Promise<void> {
    for (const obs of observations) {
      await this.upsertObservation(obs);
    }
  }

  // Helper for testing
  clear(): void {
    this.observations = [];
  }

  getAll(): GeoObservation[] {
    return [...this.observations];
  }
}
