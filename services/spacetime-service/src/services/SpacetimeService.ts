/**
 * Spacetime Service
 *
 * Main service class providing the public API for temporal-geospatial queries.
 * Coordinates between indexes, query implementations, and storage.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  SpacetimeConfig,
  TimeEvent,
  Interval,
  GeoPoint,
  Trajectory,
  CoPresenceQuery,
  CoPresenceEpisode,
  EntitiesInRegionQuery,
  EntityInRegionResult,
  TrajectoryQuery,
  DwellQuery,
  DwellEpisode,
  SpacetimeSummary,
  DerivedEventReference,
  PolicyContext,
  TimeWindow,
  Coordinate,
} from '../types/index.js';
import {
  SpacetimeIndex,
  createSpacetimeIndex,
  type SpacetimeEntry,
} from '../indexes/SpacetimeIndex.js';
import {
  executeCoPresenceQuery,
  calculateCoPresenceStats,
  type CoPresenceConfig,
} from '../queries/CoPresenceQuery.js';
import {
  executeEntitiesInRegionQuery,
  countEntitiesInRegion,
  findRegionTransitions,
  type EntitiesInRegionConfig,
} from '../queries/EntitiesInRegionQuery.js';
import {
  executeTrajectoryQuery,
  getTrajectorySegments,
  type TrajectoryConfig,
} from '../queries/TrajectoryQuery.js';
import {
  executeDwellQuery,
  detectAllDwellEpisodes,
  calculateDwellStats,
  type DwellConfig,
} from '../queries/DwellQuery.js';
import {
  createGuards,
  guardCoPresenceQuery,
  guardEntitiesInRegionQuery,
  guardTrajectoryQuery,
  guardDwellQuery,
  limitResults,
  type QueryGuardConfig,
} from './QueryGuards.js';
import { calculatePathDistance } from '../utils/geo.js';

/**
 * Event emitter interface for derived events
 */
export interface DerivedEventEmitter {
  emit(event: DerivedEventReference): void;
}

/**
 * Storage adapter interface for persistence
 */
export interface StorageAdapter {
  saveTimeEvent(event: TimeEvent): Promise<void>;
  saveInterval(interval: Interval): Promise<void>;
  saveGeoPoint(point: GeoPoint): Promise<void>;
  saveTrajectory(trajectory: Trajectory): Promise<void>;
  loadTimeEvents(tenantId: string, timeRange?: TimeWindow): Promise<TimeEvent[]>;
  loadIntervals(tenantId: string, timeRange?: TimeWindow): Promise<Interval[]>;
  loadGeoPoints(tenantId: string, timeRange?: TimeWindow): Promise<GeoPoint[]>;
  loadTrajectories(tenantId: string, timeRange?: TimeWindow): Promise<Trajectory[]>;
}

/**
 * In-memory storage adapter (for testing/development)
 */
export class InMemoryStorageAdapter implements StorageAdapter {
  private timeEvents: TimeEvent[] = [];
  private intervals: Interval[] = [];
  private geoPoints: GeoPoint[] = [];
  private trajectories: Trajectory[] = [];

  async saveTimeEvent(event: TimeEvent): Promise<void> {
    this.timeEvents.push(event);
  }

  async saveInterval(interval: Interval): Promise<void> {
    this.intervals.push(interval);
  }

  async saveGeoPoint(point: GeoPoint): Promise<void> {
    this.geoPoints.push(point);
  }

  async saveTrajectory(trajectory: Trajectory): Promise<void> {
    this.trajectories.push(trajectory);
  }

  async loadTimeEvents(tenantId: string, timeRange?: TimeWindow): Promise<TimeEvent[]> {
    return this.timeEvents.filter((e) => {
      if (e.tenantId !== tenantId) return false;
      if (timeRange) {
        return e.timestamp >= timeRange.start && e.timestamp <= timeRange.end;
      }
      return true;
    });
  }

  async loadIntervals(tenantId: string, timeRange?: TimeWindow): Promise<Interval[]> {
    return this.intervals.filter((i) => {
      if (i.tenantId !== tenantId) return false;
      if (timeRange) {
        return i.end >= timeRange.start && i.start <= timeRange.end;
      }
      return true;
    });
  }

  async loadGeoPoints(tenantId: string, timeRange?: TimeWindow): Promise<GeoPoint[]> {
    return this.geoPoints.filter((p) => {
      if (p.tenantId !== tenantId) return false;
      if (timeRange && p.timestamp) {
        return p.timestamp >= timeRange.start && p.timestamp <= timeRange.end;
      }
      return true;
    });
  }

  async loadTrajectories(tenantId: string, timeRange?: TimeWindow): Promise<Trajectory[]> {
    return this.trajectories.filter((t) => {
      if (t.tenantId !== tenantId) return false;
      if (timeRange) {
        return t.endTime >= timeRange.start && t.startTime <= timeRange.end;
      }
      return true;
    });
  }

  clear(): void {
    this.timeEvents = [];
    this.intervals = [];
    this.geoPoints = [];
    this.trajectories = [];
  }
}

/**
 * No-op event emitter
 */
class NoOpEmitter implements DerivedEventEmitter {
  emit(_event: DerivedEventReference): void {
    // No-op
  }
}

/**
 * Main Spacetime Service
 */
export class SpacetimeService {
  private readonly index: SpacetimeIndex;
  private readonly guards: QueryGuardConfig;
  private readonly config: SpacetimeConfig;
  private readonly storage: StorageAdapter;
  private readonly emitter: DerivedEventEmitter;
  private readonly queryLog: Array<{
    type: string;
    tenantId: string;
    timestamp: number;
    duration: number;
  }> = [];

  constructor(
    config?: Partial<SpacetimeConfig>,
    storage?: StorageAdapter,
    emitter?: DerivedEventEmitter,
  ) {
    this.config = {
      maxQueryAreaSqMeters: config?.maxQueryAreaSqMeters ?? 1_000_000_000_000,
      maxTimeSpanMs: config?.maxTimeSpanMs ?? 365 * 24 * 60 * 60 * 1000,
      maxResultCardinality: config?.maxResultCardinality ?? 10_000,
      maxEntitiesPerQuery: config?.maxEntitiesPerQuery ?? 1000,
      geohashPrecision: config?.geohashPrecision ?? 7,
      defaultConfidenceThreshold: config?.defaultConfidenceThreshold ?? 0.5,
      enableQueryLogging: config?.enableQueryLogging ?? true,
      retentionPolicyDays: config?.retentionPolicyDays,
    };

    this.index = createSpacetimeIndex(this.config.geohashPrecision);
    this.guards = createGuards(this.config);
    this.storage = storage ?? new InMemoryStorageAdapter();
    this.emitter = emitter ?? new NoOpEmitter();
  }

  // =========================================================================
  // Data Ingestion
  // =========================================================================

  /**
   * Ingest a time event
   */
  async ingestTimeEvent(event: TimeEvent): Promise<void> {
    this.index.insertTimeEvent(event);
    await this.storage.saveTimeEvent(event);
  }

  /**
   * Ingest an interval
   */
  async ingestInterval(interval: Interval): Promise<void> {
    this.index.insertInterval(interval);
    await this.storage.saveInterval(interval);
  }

  /**
   * Ingest a geo point
   */
  async ingestGeoPoint(point: GeoPoint): Promise<void> {
    this.index.insertGeoPoint(point);
    await this.storage.saveGeoPoint(point);
  }

  /**
   * Ingest a trajectory
   */
  async ingestTrajectory(trajectory: Trajectory): Promise<void> {
    this.index.insertTrajectory(trajectory);
    await this.storage.saveTrajectory(trajectory);
  }

  /**
   * Bulk ingest time events
   */
  async ingestTimeEventsBatch(events: TimeEvent[]): Promise<void> {
    for (const event of events) {
      this.index.insertTimeEvent(event);
      await this.storage.saveTimeEvent(event);
    }
  }

  // =========================================================================
  // Query APIs
  // =========================================================================

  /**
   * Find co-presence episodes
   */
  findCoPresence(
    query: CoPresenceQuery,
    config?: Partial<CoPresenceConfig>,
  ): CoPresenceEpisode[] {
    const startTime = Date.now();

    // Apply guards
    guardCoPresenceQuery(query, this.guards);

    // Execute query
    const results = executeCoPresenceQuery(this.index, query, config);

    // Apply result limit
    const { results: limited, truncated } = limitResults(results, this.guards);

    // Log query
    this.logQuery('findCoPresence', query.context.tenantId, startTime);

    // Emit derived events for co-presence episodes
    for (const episode of limited) {
      this.emitCoPresenceEvent(episode, query.context);
    }

    return limited;
  }

  /**
   * Find entities in a geographic region
   */
  findEntitiesInRegion(
    query: EntitiesInRegionQuery,
    config?: Partial<EntitiesInRegionConfig>,
  ): EntityInRegionResult[] {
    const startTime = Date.now();

    // Apply guards
    guardEntitiesInRegionQuery(query, this.guards);

    // Execute query
    const results = executeEntitiesInRegionQuery(this.index, query, config);

    // Log query
    this.logQuery('findEntitiesInRegion', query.context.tenantId, startTime);

    return results;
  }

  /**
   * Count entities in a region (faster than full query)
   */
  countEntitiesInRegion(query: EntitiesInRegionQuery): number {
    guardEntitiesInRegionQuery(query, this.guards);
    return countEntitiesInRegion(this.index, query);
  }

  /**
   * Get trajectory for an entity
   */
  getTrajectory(
    query: TrajectoryQuery,
    config?: Partial<TrajectoryConfig>,
  ): Trajectory | null {
    const startTime = Date.now();

    // Apply guards
    guardTrajectoryQuery(query, this.guards);

    // Execute query
    const result = executeTrajectoryQuery(this.index, query, config);

    // Log query
    this.logQuery('getTrajectory', query.context.tenantId, startTime);

    return result;
  }

  /**
   * Get trajectory segments (split by gaps)
   */
  getTrajectorySegments(
    query: TrajectoryQuery,
    config?: Partial<TrajectoryConfig>,
  ): Trajectory[] {
    guardTrajectoryQuery(query, this.guards);
    return getTrajectorySegments(this.index, query, config);
  }

  /**
   * Detect dwell episodes
   */
  detectDwell(
    query: DwellQuery,
    config?: Partial<DwellConfig>,
  ): DwellEpisode[] {
    const startTime = Date.now();

    // Apply guards
    guardDwellQuery(query, this.guards);

    // Execute query
    const results = executeDwellQuery(this.index, query, config);

    // Apply result limit
    const { results: limited } = limitResults(results, this.guards);

    // Log query
    this.logQuery('detectDwell', query.context.tenantId, startTime);

    // Emit derived events for dwell episodes
    for (const episode of limited) {
      this.emitDwellEvent(episode, query.context);
    }

    return limited;
  }

  /**
   * Detect all dwell episodes for an entity (without specific area)
   */
  detectAllDwell(
    entityId: string,
    minDuration: number,
    context: PolicyContext,
    config?: Partial<DwellConfig>,
  ): DwellEpisode[] {
    return detectAllDwellEpisodes(
      this.index,
      entityId,
      minDuration,
      context,
      config,
    );
  }

  // =========================================================================
  // Summary APIs (for Analytics/Copilot)
  // =========================================================================

  /**
   * Get spacetime summary for an entity
   */
  getSpacetimeSummary(
    entityId: string,
    timeRange: TimeWindow,
    context: PolicyContext,
  ): SpacetimeSummary {
    const startTime = Date.now();

    // Get entity timeline
    const entries = this.index.getEntityTimeline(entityId, timeRange);

    // Filter by policy
    const filtered = entries.filter((e) => {
      if (e.tenantId !== context.tenantId) return false;
      if (context.policyLabels.length > 0) {
        const entryLabels = new Set(e.policyLabels);
        return context.policyLabels.every((l) => entryLabels.has(l));
      }
      return true;
    });

    // Calculate statistics
    const coordinates = filtered.map((e) => e.coordinate);
    const totalDistance = calculatePathDistance(coordinates);

    const duration = (timeRange.end - timeRange.start) / 1000;
    const averageSpeed = duration > 0 ? totalDistance / duration : 0;

    // Get dwell episodes
    const dwellEpisodes = this.detectAllDwell(entityId, 60000, context); // 1 min minimum
    const dwellStats = calculateDwellStats(dwellEpisodes);

    // Calculate unique locations
    const uniqueLocations = this.countUniqueLocations(filtered, 100);

    // Calculate max speed
    let maxSpeed = 0;
    for (const entry of filtered) {
      const speed = entry.attributes.speed as number | undefined;
      if (speed !== undefined && speed > maxSpeed) {
        maxSpeed = speed;
      }
    }

    // Get primary locations (top dwell locations)
    const primaryLocations = dwellEpisodes
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5)
      .map((d) => ({
        coordinate: d.centroid,
        visitCount: 1,
        totalDuration: d.duration,
      }));

    // Calculate bounding box
    let boundingBox: { minLat: number; maxLat: number; minLon: number; maxLon: number } | undefined;
    if (coordinates.length > 0) {
      let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
      for (const c of coordinates) {
        minLat = Math.min(minLat, c.latitude);
        maxLat = Math.max(maxLat, c.latitude);
        minLon = Math.min(minLon, c.longitude);
        maxLon = Math.max(maxLon, c.longitude);
      }
      boundingBox = { minLat, maxLat, minLon, maxLon };
    }

    // Log query
    this.logQuery('getSpacetimeSummary', context.tenantId, startTime);

    return {
      entityId,
      timeRange,
      statistics: {
        totalObservations: filtered.length,
        uniqueLocations,
        totalDistance,
        averageSpeed: averageSpeed > 0 ? averageSpeed : undefined,
        maxSpeed: maxSpeed > 0 ? maxSpeed : undefined,
        dwellCount: dwellStats.dwellCount,
        totalDwellTime: dwellStats.totalDwellTime,
      },
      boundingBox,
      primaryLocations: primaryLocations.length > 0 ? primaryLocations : undefined,
    };
  }

  /**
   * Get co-presence partners for an entity
   */
  getCoPresencePartners(
    entityId: string,
    timeRange: TimeWindow,
    radius: number,
    context: PolicyContext,
  ): Array<{
    entityId: string;
    episodeCount: number;
    totalDuration: number;
  }> {
    // Get all entities in the index
    const allEntityIds = this.index.getEntityIds();

    // For each other entity, check co-presence with target
    const partners: Map<string, { episodeCount: number; totalDuration: number }> = new Map();

    for (const otherEntityId of allEntityIds) {
      if (otherEntityId === entityId) continue;

      const episodes = this.findCoPresence({
        entityIds: [entityId, otherEntityId],
        timeWindow: timeRange,
        radius,
        minOverlapDuration: 0,
        minConfidence: 0.5,
        context,
      });

      if (episodes.length > 0) {
        const totalDuration = episodes.reduce((sum, e) => sum + e.duration, 0);
        partners.set(otherEntityId, {
          episodeCount: episodes.length,
          totalDuration,
        });
      }
    }

    // Sort by total duration
    return Array.from(partners.entries())
      .map(([id, stats]) => ({ entityId: id, ...stats }))
      .sort((a, b) => b.totalDuration - a.totalDuration);
  }

  // =========================================================================
  // Index Management
  // =========================================================================

  /**
   * Get index statistics
   */
  getIndexStats(): {
    entryCount: number;
    entityCount: number;
    timeBounds: TimeWindow | null;
    spatialBounds: { minLat: number; maxLat: number; minLon: number; maxLon: number } | null;
  } {
    return {
      entryCount: this.index.count,
      entityCount: this.index.getEntityIds().length,
      timeBounds: this.index.getTimeBounds(),
      spatialBounds: this.index.getSpatialBounds(),
    };
  }

  /**
   * Clear all data from index (and optionally storage)
   */
  clear(clearStorage: boolean = false): void {
    this.index.clear();
    if (clearStorage && this.storage instanceof InMemoryStorageAdapter) {
      this.storage.clear();
    }
  }

  /**
   * Load data from storage into index
   */
  async loadFromStorage(tenantId: string, timeRange?: TimeWindow): Promise<void> {
    const [events, intervals, points, trajectories] = await Promise.all([
      this.storage.loadTimeEvents(tenantId, timeRange),
      this.storage.loadIntervals(tenantId, timeRange),
      this.storage.loadGeoPoints(tenantId, timeRange),
      this.storage.loadTrajectories(tenantId, timeRange),
    ]);

    for (const event of events) {
      this.index.insertTimeEvent(event);
    }

    for (const interval of intervals) {
      this.index.insertInterval(interval);
    }

    for (const point of points) {
      this.index.insertGeoPoint(point);
    }

    for (const trajectory of trajectories) {
      this.index.insertTrajectory(trajectory);
    }
  }

  /**
   * Get query log (if enabled)
   */
  getQueryLog(): Array<{
    type: string;
    tenantId: string;
    timestamp: number;
    duration: number;
  }> {
    return [...this.queryLog];
  }

  // =========================================================================
  // Private Helpers
  // =========================================================================

  private logQuery(type: string, tenantId: string, startTime: number): void {
    if (this.config.enableQueryLogging) {
      this.queryLog.push({
        type,
        tenantId,
        timestamp: startTime,
        duration: Date.now() - startTime,
      });

      // Keep only last 1000 entries
      while (this.queryLog.length > 1000) {
        this.queryLog.shift();
      }
    }
  }

  private emitCoPresenceEvent(
    episode: CoPresenceEpisode,
    context: PolicyContext,
  ): void {
    const event: DerivedEventReference = {
      id: uuidv4(),
      type: 'co_presence',
      sourceEntityIds: episode.entityIds,
      timeRange: { start: episode.startTime, end: episode.endTime },
      location: episode.centroid,
      confidence: episode.confidence,
      metadata: {
        duration: episode.duration,
        radius: episode.radius,
        overlapCount: episode.overlapCount,
      },
      tenantId: context.tenantId,
      policyLabels: context.policyLabels,
      generatedAt: Date.now(),
    };

    this.emitter.emit(event);
  }

  private emitDwellEvent(
    episode: DwellEpisode,
    context: PolicyContext,
  ): void {
    const event: DerivedEventReference = {
      id: uuidv4(),
      type: 'dwell',
      sourceEntityIds: [episode.entityId],
      timeRange: { start: episode.startTime, end: episode.endTime },
      location: episode.centroid,
      confidence: episode.confidence,
      metadata: {
        duration: episode.duration,
        pointCount: episode.pointCount,
      },
      tenantId: context.tenantId,
      policyLabels: context.policyLabels,
      generatedAt: Date.now(),
    };

    this.emitter.emit(event);
  }

  private countUniqueLocations(
    entries: SpacetimeEntry[],
    radiusMeters: number,
  ): number {
    const unique: Coordinate[] = [];

    for (const entry of entries) {
      const isNearExisting = unique.some((u) => {
        const dLat = u.latitude - entry.coordinate.latitude;
        const dLon = u.longitude - entry.coordinate.longitude;
        // Quick approximation before precise calculation
        if (Math.abs(dLat) > 0.01 || Math.abs(dLon) > 0.01) return false;

        // Precise haversine for nearby points
        const R = 6371000;
        const lat1 = (u.latitude * Math.PI) / 180;
        const lat2 = (entry.coordinate.latitude * Math.PI) / 180;
        const deltaLat = ((entry.coordinate.latitude - u.latitude) * Math.PI) / 180;
        const deltaLon = ((entry.coordinate.longitude - u.longitude) * Math.PI) / 180;
        const a =
          Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c <= radiusMeters;
      });

      if (!isNearExisting) {
        unique.push(entry.coordinate);
      }
    }

    return unique.length;
  }
}

/**
 * Factory function to create a SpacetimeService
 */
export function createSpacetimeService(
  config?: Partial<SpacetimeConfig>,
  storage?: StorageAdapter,
  emitter?: DerivedEventEmitter,
): SpacetimeService {
  return new SpacetimeService(config, storage, emitter);
}
