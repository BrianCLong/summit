/**
 * Geo-Temporal Analytics Types
 *
 * Data models for trajectory analysis, stay-point detection,
 * co-presence/rendezvous detection, and convoy (group movement) analysis.
 *
 * Stack: TypeScript + Neo4j (v6)
 * Integration: Extends @intelgraph/geospatial package
 */

import { GeoPoint } from './geospatial.js';

/**
 * Entity types that can have geo-temporal observations
 */
export type EntityType = 'PERSON' | 'DEVICE' | 'VEHICLE' | 'VESSEL' | 'AIRCRAFT' | 'OTHER';

/**
 * Time range for queries
 */
export interface TimeRange {
  from?: string; // ISO 8601
  to?: string; // ISO 8601
}

/**
 * Location with extended metadata
 */
export interface Location {
  id: string;
  latitude: number;
  longitude: number;
  name?: string;
  countryCode?: string;
  city?: string;
  accuracyMeters?: number;
  elevation?: number;
}

/**
 * Geo-temporal observation - an entity at a location during a time window
 */
export interface GeoObservation {
  id: string;
  entityId: string;
  entityType: EntityType;
  location: Location;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  sourceSystem?: string;
  confidence?: number; // 0-1
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Trajectory point - simplified representation for path analysis
 */
export interface TrajectoryPoint {
  observationId: string;
  entityId: string;
  latitude: number;
  longitude: number;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  locationId?: string;
  elevation?: number;
}

/**
 * Stay point - location where entity remained for significant duration
 */
export interface StayPoint {
  id: string;
  entityId: string;
  latitude: number;
  longitude: number;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  radiusMeters: number;
  numObservations: number;
  locationIds?: string[];
  durationMinutes: number;
}

/**
 * Parameters for stay-point detection
 */
export interface StayPointParams {
  radiusMeters: number; // R - maximum radius to consider a stay
  minDurationMinutes: number; // D - minimum time to qualify as stay
}

/**
 * Co-presence interval - time period when entities were co-located
 */
export interface CoPresenceInterval {
  id: string;
  entities: string[]; // entity IDs
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  maxDistanceMeters: number;
  numOverlappingObservations: number;
  centroidLatitude: number;
  centroidLongitude: number;
  overlapDurationMinutes: number;
}

/**
 * Parameters for co-presence detection
 */
export interface CoPresenceParams {
  maxDistanceMeters: number; // R - maximum distance between entities
  minOverlapMinutes: number; // W - minimum overlap duration
}

/**
 * Convoy - group of entities moving together over multiple time steps
 */
export interface Convoy {
  id: string;
  entities: string[]; // entity IDs
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  numSteps: number;
  avgDistanceMeters: number;
  trajectory: Array<{
    stepTime: string;
    centroidLatitude: number;
    centroidLongitude: number;
    entityCount: number;
  }>;
}

/**
 * Parameters for convoy detection
 */
export interface ConvoyParams {
  maxDistanceMeters: number; // R - maximum distance between group members
  minGroupSize: number; // minimum entities to form a convoy
  minSteps: number; // K - minimum consecutive time steps
  stepDurationMinutes?: number; // time discretization (default: 15)
}

/**
 * Query options for geo-temporal analytics
 */
export interface GeoTemporalQueryOptions {
  timeRange?: TimeRange;
  entityIds?: string[];
  entityTypes?: EntityType[];
  boundingBox?: {
    minLat: number;
    minLon: number;
    maxLat: number;
    maxLon: number;
  };
  limit?: number;
  offset?: number;
}

/**
 * Trajectory analysis result
 */
export interface TrajectoryAnalysis {
  entityId: string;
  points: TrajectoryPoint[];
  totalDistanceMeters: number;
  totalDurationMinutes: number;
  averageSpeedMetersPerSecond: number;
  startTime: string;
  endTime: string;
}

/**
 * Movement pattern analysis
 */
export interface MovementPattern {
  entityId: string;
  patternType: 'STATIONARY' | 'LINEAR' | 'CIRCULAR' | 'RANDOM';
  confidence: number;
  stayPoints: StayPoint[];
  frequentLocations: Array<{
    latitude: number;
    longitude: number;
    visitCount: number;
    totalDurationMinutes: number;
  }>;
}

/**
 * Spatial-temporal cluster
 */
export interface SpatioTemporalCluster {
  id: string;
  observations: GeoObservation[];
  centroid: GeoPoint & { time: string };
  radiusMeters: number;
  timeSpanMinutes: number;
  density: number;
  entityCount: number;
}
