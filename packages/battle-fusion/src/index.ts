/**
 * @intelgraph/battle-fusion
 * Multidomain Data Fusion Engine for Battle Management
 */

import type {
  BattlefieldEntity,
  DataConflict,
  DataDomain,
  DataSource,
  DOMAIN_WEIGHTS,
  EntityCorrelation,
  FusedEntity,
  FusionResult,
  GeoLocation,
  NormalizedIngestEvent,
  ProvenanceChain,
  RELIABILITY_SCORES,
  CREDIBILITY_SCORES,
  SituationalPicture,
  SourceContribution,
  ThreatAssessment,
  ThreatLevel,
} from '@intelgraph/battle-types';

// Re-export types
export * from '@intelgraph/battle-types';

// =============================================================================
// FUSION ENGINE
// =============================================================================

export interface FusionEngineConfig {
  domainWeights?: Partial<Record<DataDomain, number>>;
  conflictResolution?: 'HIGHEST_CONFIDENCE' | 'MOST_RECENT' | 'WEIGHTED_AVERAGE';
  correlationThreshold?: number;
  maxEntityAge?: number; // milliseconds
  enablePrediction?: boolean;
}

const DEFAULT_CONFIG: FusionEngineConfig = {
  conflictResolution: 'HIGHEST_CONFIDENCE',
  correlationThreshold: 0.7,
  maxEntityAge: 300000, // 5 minutes
  enablePrediction: true,
};

const DOMAIN_WEIGHTS_DEFAULT: Record<DataDomain, number> = {
  SENSOR_GRID: 0.15,
  SATELLITE: 0.15,
  COMMS: 0.10,
  CYBER: 0.08,
  HUMINT: 0.12,
  SIGINT: 0.12,
  IMINT: 0.10,
  GEOINT: 0.08,
  OSINT: 0.04,
  ELINT: 0.03,
  MASINT: 0.02,
  EXTERNAL: 0.01,
};

const RELIABILITY_SCORES_DEFAULT: Record<string, number> = {
  A: 1.0,
  B: 0.8,
  C: 0.6,
  D: 0.4,
  E: 0.2,
  F: 0.0,
};

const CREDIBILITY_SCORES_DEFAULT: Record<number, number> = {
  1: 1.0,
  2: 0.8,
  3: 0.6,
  4: 0.4,
  5: 0.2,
  6: 0.0,
};

export class FusionEngine {
  private config: FusionEngineConfig;
  private entityCache: Map<string, FusedEntity> = new Map();
  private sourceRegistry: Map<string, DataSource> = new Map();
  private pendingEvents: NormalizedIngestEvent[] = [];

  constructor(config: Partial<FusionEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Register a data source with reliability/credibility ratings
   */
  registerSource(source: DataSource): void {
    this.sourceRegistry.set(source.id, source);
  }

  /**
   * Ingest normalized event and queue for fusion
   */
  ingestEvent(event: NormalizedIngestEvent): void {
    this.pendingEvents.push(event);
  }

  /**
   * Execute fusion cycle on pending events
   */
  async executeFusion(): Promise<FusionResult> {
    const startTime = Date.now();
    const events = this.pendingEvents.splice(0);

    // Group events by potential entity
    const entityGroups = this.groupEventsByEntity(events);

    // Fuse each entity group
    const fusedEntities: FusedEntity[] = [];
    for (const [entityKey, groupEvents] of entityGroups) {
      const fused = this.fuseEntityGroup(entityKey, groupEvents);
      if (fused) {
        fusedEntities.push(fused);
        this.entityCache.set(fused.canonicalId, fused);
      }
    }

    // Find correlations between entities
    const correlations = this.findCorrelations(fusedEntities);

    // Generate situational picture
    const situationalPicture = this.generateSituationalPicture(fusedEntities);

    // Calculate fusion metadata
    const domainCoverage = [...new Set(events.map((e) => e.domain))];

    return {
      fusionId: `fusion-${Date.now()}`,
      timestamp: new Date(),
      entities: fusedEntities,
      correlations,
      situationalPicture,
      confidence: this.calculateOverallConfidence(fusedEntities),
      sourceCount: events.length,
      domainCoverage,
    };
  }

  /**
   * Group events by their likely entity match
   */
  private groupEventsByEntity(
    events: NormalizedIngestEvent[],
  ): Map<string, NormalizedIngestEvent[]> {
    const groups = new Map<string, NormalizedIngestEvent[]>();

    for (const event of events) {
      const key = this.computeEntityKey(event);
      const group = groups.get(key) || [];
      group.push(event);
      groups.set(key, group);
    }

    return groups;
  }

  /**
   * Compute a grouping key for entity matching
   */
  private computeEntityKey(event: NormalizedIngestEvent): string {
    // Use entity ID if available
    if (event.entityId) {
      return event.entityId;
    }

    // Otherwise use location-based clustering
    if (event.location) {
      const gridX = Math.floor(event.location.latitude * 100);
      const gridY = Math.floor(event.location.longitude * 100);
      return `loc-${gridX}-${gridY}-${event.entityType}`;
    }

    return `unknown-${event.eventId}`;
  }

  /**
   * Fuse a group of events into a single entity
   */
  private fuseEntityGroup(
    entityKey: string,
    events: NormalizedIngestEvent[],
  ): FusedEntity | null {
    if (events.length === 0) return null;

    // Get existing entity if any
    const existing = this.entityCache.get(entityKey);

    // Calculate weighted contributions from each source
    const contributions: SourceContribution[] = events.map((event) => ({
      sourceId: event.sourceId,
      domain: event.domain,
      weight: this.calculateSourceWeight(event),
      confidence: event.confidence,
      timestamp: event.timestamp,
    }));

    // Merge data fields with conflict resolution
    const mergedData = this.mergeEntityData(events, contributions);
    const conflicts = this.detectConflicts(events);

    // Build battlefield entity
    const entity = this.buildBattlefieldEntity(entityKey, mergedData, events);

    // Calculate fusion score
    const fusionScore = this.calculateFusionScore(contributions);

    return {
      id: `fused-${entityKey}`,
      canonicalId: entityKey,
      entity,
      fusionScore,
      contributingSources: contributions,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      lastFused: new Date(),
    };
  }

  /**
   * Calculate source weight based on domain and reliability
   */
  private calculateSourceWeight(event: NormalizedIngestEvent): number {
    const domainWeight =
      this.config.domainWeights?.[event.domain] ??
      DOMAIN_WEIGHTS_DEFAULT[event.domain] ??
      0.05;

    const source = this.sourceRegistry.get(event.sourceId);
    if (!source) {
      return domainWeight * event.confidence;
    }

    const reliabilityScore =
      RELIABILITY_SCORES_DEFAULT[source.reliability] ?? 0.5;
    const credibilityScore =
      CREDIBILITY_SCORES_DEFAULT[source.credibility] ?? 0.5;

    return domainWeight * reliabilityScore * credibilityScore * event.confidence;
  }

  /**
   * Merge entity data from multiple sources
   */
  private mergeEntityData(
    events: NormalizedIngestEvent[],
    contributions: SourceContribution[],
  ): Record<string, unknown> {
    const merged: Record<string, unknown> = {};
    const fieldWeights: Record<string, Array<{ value: unknown; weight: number }>> =
      {};

    // Collect all field values with their weights
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const weight = contributions[i].weight;

      for (const [field, value] of Object.entries(event.data)) {
        if (!fieldWeights[field]) {
          fieldWeights[field] = [];
        }
        fieldWeights[field].push({ value, weight });
      }
    }

    // Resolve each field based on config
    for (const [field, values] of Object.entries(fieldWeights)) {
      merged[field] = this.resolveFieldValue(values);
    }

    return merged;
  }

  /**
   * Resolve field value based on conflict resolution strategy
   */
  private resolveFieldValue(
    values: Array<{ value: unknown; weight: number }>,
  ): unknown {
    if (values.length === 0) return undefined;
    if (values.length === 1) return values[0].value;

    switch (this.config.conflictResolution) {
      case 'HIGHEST_CONFIDENCE':
        return values.reduce((a, b) => (a.weight > b.weight ? a : b)).value;

      case 'WEIGHTED_AVERAGE':
        // Only works for numeric values
        if (typeof values[0].value === 'number') {
          const totalWeight = values.reduce((sum, v) => sum + v.weight, 0);
          return (
            values.reduce(
              (sum, v) => sum + (v.value as number) * v.weight,
              0,
            ) / totalWeight
          );
        }
        return values.reduce((a, b) => (a.weight > b.weight ? a : b)).value;

      case 'MOST_RECENT':
      default:
        return values[values.length - 1].value;
    }
  }

  /**
   * Detect conflicts between event data
   */
  private detectConflicts(events: NormalizedIngestEvent[]): DataConflict[] {
    const conflicts: DataConflict[] = [];
    const fieldValues: Record<
      string,
      Array<{ value: unknown; sourceId: string; confidence: number }>
    > = {};

    for (const event of events) {
      for (const [field, value] of Object.entries(event.data)) {
        if (!fieldValues[field]) {
          fieldValues[field] = [];
        }
        fieldValues[field].push({
          value,
          sourceId: event.sourceId,
          confidence: event.confidence,
        });
      }
    }

    for (const [field, values] of Object.entries(fieldValues)) {
      const uniqueValues = new Set(values.map((v) => JSON.stringify(v.value)));
      if (uniqueValues.size > 1) {
        conflicts.push({
          field,
          values,
          resolution: {
            selectedValue: this.resolveFieldValue(
              values.map((v) => ({ value: v.value, weight: v.confidence })),
            ),
            method: this.config.conflictResolution || 'HIGHEST_CONFIDENCE',
          },
        });
      }
    }

    return conflicts;
  }

  /**
   * Build a battlefield entity from merged data
   */
  private buildBattlefieldEntity(
    entityKey: string,
    data: Record<string, unknown>,
    events: NormalizedIngestEvent[],
  ): BattlefieldEntity {
    // Get most recent location
    const latestWithLocation = events
      .filter((e) => e.location)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

    const location: GeoLocation = latestWithLocation?.location || {
      latitude: 0,
      longitude: 0,
    };

    return {
      id: entityKey,
      name: (data.name as string) || (data.designation as string) || entityKey,
      designation: data.designation as string,
      forceType: (data.forceType as any) || 'UNKNOWN',
      unitType: (data.unitType as any) || 'INFANTRY',
      status: (data.status as any) || 'UNKNOWN',
      location,
      heading: data.heading as number,
      speed: data.speed as number,
      strength: data.strength as number,
      confidence: this.calculateEntityConfidence(events),
      lastUpdated: new Date(
        Math.max(...events.map((e) => e.timestamp.getTime())),
      ),
      sources: [...new Set(events.map((e) => e.sourceId))],
      metadata: data,
    };
  }

  /**
   * Calculate entity confidence from events
   */
  private calculateEntityConfidence(events: NormalizedIngestEvent[]): number {
    if (events.length === 0) return 0;

    // Weighted average confidence
    let totalWeight = 0;
    let weightedSum = 0;

    for (const event of events) {
      const weight = this.calculateSourceWeight(event);
      weightedSum += event.confidence * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Calculate overall fusion score
   */
  private calculateFusionScore(contributions: SourceContribution[]): number {
    if (contributions.length === 0) return 0;

    // Higher score for more diverse sources
    const uniqueDomains = new Set(contributions.map((c) => c.domain)).size;
    const domainDiversity = Math.min(uniqueDomains / 5, 1); // Cap at 5 domains

    // Average weighted confidence
    const totalWeight = contributions.reduce((sum, c) => sum + c.weight, 0);
    const avgConfidence =
      contributions.reduce((sum, c) => sum + c.confidence * c.weight, 0) /
      totalWeight;

    return (domainDiversity * 0.3 + avgConfidence * 0.7);
  }

  /**
   * Find correlations between fused entities
   */
  private findCorrelations(entities: FusedEntity[]): EntityCorrelation[] {
    const correlations: EntityCorrelation[] = [];

    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const e1 = entities[i];
        const e2 = entities[j];

        // Check spatial proximity
        const distance = this.calculateDistance(
          e1.entity.location,
          e2.entity.location,
        );

        if (distance < 1) {
          // Within 1km
          correlations.push({
            entityId1: e1.canonicalId,
            entityId2: e2.canonicalId,
            correlationType: 'RELATED',
            confidence: 0.8 - distance * 0.3,
            evidence: [`Spatial proximity: ${distance.toFixed(2)}km`],
          });
        }

        // Check command relationships
        if (
          e1.entity.unitType === 'COMMAND' &&
          e1.entity.forceType === e2.entity.forceType
        ) {
          correlations.push({
            entityId1: e1.canonicalId,
            entityId2: e2.canonicalId,
            correlationType: 'COMMANDING',
            confidence: 0.6,
            evidence: ['Unit type relationship'],
          });
        }
      }
    }

    return correlations.filter(
      (c) => c.confidence >= (this.config.correlationThreshold || 0.7),
    );
  }

  /**
   * Calculate distance between two locations (Haversine formula)
   */
  private calculateDistance(loc1: GeoLocation, loc2: GeoLocation): number {
    const R = 6371; // Earth radius in km
    const dLat = this.toRad(loc2.latitude - loc1.latitude);
    const dLon = this.toRad(loc2.longitude - loc1.longitude);
    const lat1 = this.toRad(loc1.latitude);
    const lat2 = this.toRad(loc2.latitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  /**
   * Generate situational picture from fused entities
   */
  private generateSituationalPicture(
    entities: FusedEntity[],
  ): SituationalPicture {
    const blueForces = entities
      .filter((e) => e.entity.forceType === 'BLUE')
      .map((e) => e.entity);
    const redForces = entities
      .filter((e) => e.entity.forceType === 'RED')
      .map((e) => e.entity);
    const neutralForces = entities
      .filter((e) => e.entity.forceType === 'NEUTRAL')
      .map((e) => e.entity);
    const unknownContacts = entities
      .filter((e) => e.entity.forceType === 'UNKNOWN')
      .map((e) => e.entity);

    // Generate threat assessments for red forces
    const threats: ThreatAssessment[] = redForces.map((entity) =>
      this.assessThreat(entity, blueForces),
    );

    return {
      timestamp: new Date(),
      areaOfInterest: this.calculateBoundingBox(entities.map((e) => e.entity)),
      blueForces,
      redForces,
      neutralForces,
      unknownContacts,
      threats,
      logisticsStatus: {
        timestamp: new Date(),
        supplyLines: [],
        depots: [],
        convoys: [],
        overallReadiness: 85,
      },
    };
  }

  /**
   * Assess threat level of an entity
   */
  private assessThreat(
    entity: BattlefieldEntity,
    friendlyForces: BattlefieldEntity[],
  ): ThreatAssessment {
    // Calculate threat level based on proximity and capability
    let threatLevel: ThreatLevel = 'LOW';

    const nearestFriendly = friendlyForces.reduce((nearest, friendly) => {
      const dist = this.calculateDistance(entity.location, friendly.location);
      return dist < nearest ? dist : nearest;
    }, Infinity);

    if (nearestFriendly < 5) threatLevel = 'CRITICAL';
    else if (nearestFriendly < 20) threatLevel = 'HIGH';
    else if (nearestFriendly < 50) threatLevel = 'MEDIUM';
    else if (nearestFriendly < 100) threatLevel = 'LOW';
    else threatLevel = 'MINIMAL';

    return {
      id: `threat-${entity.id}`,
      entityId: entity.id,
      threatLevel,
      threatType: entity.unitType,
      capabilities: this.inferCapabilities(entity),
      intent: entity.status === 'ENGAGED' ? 'OFFENSIVE' : 'UNKNOWN',
      confidence: entity.confidence,
    };
  }

  /**
   * Infer capabilities from entity type
   */
  private inferCapabilities(entity: BattlefieldEntity): string[] {
    const capabilities: Record<string, string[]> = {
      INFANTRY: ['Ground assault', 'Area denial'],
      ARMOR: ['Breakthrough', 'Direct fire support'],
      ARTILLERY: ['Indirect fire', 'Area suppression'],
      AIR: ['Air superiority', 'Close air support', 'Reconnaissance'],
      NAVAL: ['Sea control', 'Power projection'],
      CYBER: ['Network disruption', 'Information warfare'],
      LOGISTICS: ['Supply', 'Transport'],
      COMMAND: ['Command and control', 'Coordination'],
      RECON: ['Intelligence gathering', 'Target acquisition'],
      SPECIAL_OPS: ['Precision strike', 'Sabotage', 'Infiltration'],
    };

    return capabilities[entity.unitType] || [];
  }

  /**
   * Calculate bounding box for all entities
   */
  private calculateBoundingBox(
    entities: BattlefieldEntity[],
  ): { northWest: GeoLocation; southEast: GeoLocation } {
    if (entities.length === 0) {
      return {
        northWest: { latitude: 0, longitude: 0 },
        southEast: { latitude: 0, longitude: 0 },
      };
    }

    let minLat = Infinity,
      maxLat = -Infinity;
    let minLon = Infinity,
      maxLon = -Infinity;

    for (const entity of entities) {
      minLat = Math.min(minLat, entity.location.latitude);
      maxLat = Math.max(maxLat, entity.location.latitude);
      minLon = Math.min(minLon, entity.location.longitude);
      maxLon = Math.max(maxLon, entity.location.longitude);
    }

    return {
      northWest: { latitude: maxLat, longitude: minLon },
      southEast: { latitude: minLat, longitude: maxLon },
    };
  }

  /**
   * Calculate overall confidence of fusion result
   */
  private calculateOverallConfidence(entities: FusedEntity[]): number {
    if (entities.length === 0) return 0;
    return (
      entities.reduce((sum, e) => sum + e.fusionScore, 0) / entities.length
    );
  }

  /**
   * Get current cached entities
   */
  getEntityCache(): Map<string, FusedEntity> {
    return new Map(this.entityCache);
  }

  /**
   * Clear stale entities from cache
   */
  clearStaleEntities(): number {
    const now = Date.now();
    const maxAge = this.config.maxEntityAge || 300000;
    let cleared = 0;

    for (const [key, entity] of this.entityCache) {
      if (now - entity.lastFused.getTime() > maxAge) {
        this.entityCache.delete(key);
        cleared++;
      }
    }

    return cleared;
  }
}

// =============================================================================
// DATA NORMALIZERS
// =============================================================================

export function normalizeSensorReading(
  raw: unknown,
  sourceId: string,
): NormalizedIngestEvent[] {
  const reading = raw as any;
  const events: NormalizedIngestEvent[] = [];

  for (const detection of reading.detections || []) {
    events.push({
      eventId: `sensor-${Date.now()}-${detection.id}`,
      sourceId,
      domain: 'SENSOR_GRID',
      timestamp: new Date(reading.timestamp),
      normalizedAt: new Date(),
      entityType: detection.classification || 'CONTACT',
      entityId: detection.id,
      location: detection.location,
      confidence: detection.confidence,
      data: {
        detectionType: detection.type,
        bearing: detection.bearing,
        range: detection.range,
        signature: detection.signature,
      },
      provenance: {
        sourceId,
        sourceDomain: 'SENSOR_GRID',
        reliability: 'B',
        credibility: 2,
        transformations: ['normalizeSensorReading'],
        correlationIds: [reading.sensorId],
      },
    });
  }

  return events;
}

export function normalizeSatelliteImagery(
  raw: unknown,
  sourceId: string,
): NormalizedIngestEvent[] {
  const imagery = raw as any;
  const events: NormalizedIngestEvent[] = [];

  for (const result of imagery.analysisResults || []) {
    events.push({
      eventId: `sat-${Date.now()}-${result.type}`,
      sourceId,
      domain: 'SATELLITE',
      timestamp: new Date(imagery.captureTime),
      normalizedAt: new Date(),
      entityType: result.classification || result.type,
      location: result.location,
      confidence: result.confidence,
      data: {
        imageId: imagery.imageId,
        satelliteId: imagery.satelliteId,
        resolution: imagery.resolution,
        classification: result.classification,
        dimensions: result.dimensions,
      },
      provenance: {
        sourceId,
        sourceDomain: 'SATELLITE',
        reliability: 'A',
        credibility: 1,
        transformations: ['normalizeSatelliteImagery'],
        correlationIds: [imagery.imageId],
      },
    });
  }

  return events;
}

export function normalizeCommsIntercept(
  raw: unknown,
  sourceId: string,
): NormalizedIngestEvent {
  const intercept = raw as any;

  return {
    eventId: `comms-${intercept.interceptId}`,
    sourceId,
    domain: 'COMMS',
    timestamp: new Date(intercept.timestamp),
    normalizedAt: new Date(),
    entityType: 'COMMS_INTERCEPT',
    location: intercept.sourceLocation,
    confidence: 0.7,
    data: {
      frequency: intercept.frequency,
      protocol: intercept.protocol,
      contentType: intercept.contentType,
      targetLocation: intercept.targetLocation,
    },
    provenance: {
      sourceId,
      sourceDomain: 'COMMS',
      reliability: 'C',
      credibility: 3,
      transformations: ['normalizeCommsIntercept'],
      correlationIds: [intercept.interceptId],
    },
  };
}

export function normalizeCyberEvent(
  raw: unknown,
  sourceId: string,
): NormalizedIngestEvent {
  const event = raw as any;

  return {
    eventId: `cyber-${event.eventId}`,
    sourceId,
    domain: 'CYBER',
    timestamp: new Date(event.timestamp),
    normalizedAt: new Date(),
    entityType: 'CYBER_THREAT',
    confidence: event.severity === 'CRITICAL' ? 0.9 : 0.6,
    data: {
      eventType: event.eventType,
      severity: event.severity,
      sourceIp: event.sourceIp,
      targetIp: event.targetIp,
      targetAsset: event.targetAsset,
      indicators: event.indicators,
      ttps: event.ttps,
      attribution: event.attribution,
    },
    provenance: {
      sourceId,
      sourceDomain: 'CYBER',
      reliability: 'B',
      credibility: 2,
      transformations: ['normalizeCyberEvent'],
      correlationIds: [event.eventId],
    },
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default FusionEngine;
