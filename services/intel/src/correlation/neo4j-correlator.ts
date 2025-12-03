/**
 * Neo4j Entity Correlator
 *
 * Correlates SIGINT/MASINT data against the Neo4j knowledge graph
 * for edge-denied operations and ODNI intelligence gap analysis.
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import neo4j, { Driver, Session, Transaction } from 'neo4j-driver';
import { v4 as uuidv4 } from 'uuid';
import {
  SignalOfInterest,
  FusedTrack,
  EntityCorrelation,
  OdniGapReference,
  GeoLocation,
  ConfidenceLevel,
  IntelAlert,
} from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Correlator configuration
 */
export interface CorrelatorConfig {
  neo4jUri: string;
  neo4jUsername: string;
  neo4jPassword: string;
  maxPathLength: number;
  minCorrelationScore: number;
  spatialProximityM: number;
  temporalWindowMs: number;
  enableOdniGapMatching: boolean;
  cacheResultsMs: number;
}

const DEFAULT_CONFIG: CorrelatorConfig = {
  neo4jUri: process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4jUsername: process.env.NEO4J_USERNAME || 'neo4j',
  neo4jPassword: process.env.NEO4J_PASSWORD || 'password',
  maxPathLength: 4,
  minCorrelationScore: 0.3,
  spatialProximityM: 50000, // 50km
  temporalWindowMs: 86400000, // 24 hours
  enableOdniGapMatching: true,
  cacheResultsMs: 300000, // 5 minutes
};

/**
 * ODNI Intelligence Gap definitions
 */
const ODNI_GAPS: OdniGapReference[] = [
  {
    gapId: 'ODNI-2025-001',
    title: 'Adversary Electronic Warfare Capabilities',
    description: 'Assessment of near-peer EW systems and tactics',
    priority: 'PRIORITY',
    category: 'EW',
    relatedRequirements: ['SIGINT-EW-01', 'MASINT-ELINT-02'],
    matchedSignals: [],
    matchedTracks: [],
    matchedEntities: [],
    lastAssessedAt: new Date(),
  },
  {
    gapId: 'ODNI-2025-002',
    title: 'Unmanned Systems Proliferation',
    description: 'Tracking proliferation of UAS/UAV capabilities',
    priority: 'IMMEDIATE',
    category: 'UAS',
    relatedRequirements: ['MASINT-RADAR-01', 'SIGINT-C2-03'],
    matchedSignals: [],
    matchedTracks: [],
    matchedEntities: [],
    lastAssessedAt: new Date(),
  },
  {
    gapId: 'ODNI-2025-003',
    title: 'Maritime Domain Awareness',
    description: 'Gaps in understanding of maritime activities',
    priority: 'PRIORITY',
    category: 'MARITIME',
    relatedRequirements: ['MASINT-AIS-01', 'SIGINT-COMMS-04'],
    matchedSignals: [],
    matchedTracks: [],
    matchedEntities: [],
    lastAssessedAt: new Date(),
  },
  {
    gapId: 'ODNI-2025-004',
    title: 'Spectrum Operations',
    description: 'Understanding of adversary spectrum management',
    priority: 'ROUTINE',
    category: 'SPECTRUM',
    relatedRequirements: ['SIGINT-SPECTRUM-01'],
    matchedSignals: [],
    matchedTracks: [],
    matchedEntities: [],
    lastAssessedAt: new Date(),
  },
];

/**
 * Neo4jCorrelator - Graph-based intelligence correlation
 */
export class Neo4jCorrelator {
  private config: CorrelatorConfig;
  private driver: Driver | null = null;
  private correlationCache: Map<string, { result: EntityCorrelation[]; timestamp: number }>;
  private odniGaps: Map<string, OdniGapReference>;
  private alertCallback?: (alert: IntelAlert) => Promise<void>;

  constructor(config: Partial<CorrelatorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.correlationCache = new Map();
    this.odniGaps = new Map(ODNI_GAPS.map((g) => [g.gapId, g]));
  }

  /**
   * Initialize connection
   */
  async connect(): Promise<void> {
    try {
      this.driver = neo4j.driver(
        this.config.neo4jUri,
        neo4j.auth.basic(this.config.neo4jUsername, this.config.neo4jPassword),
        {
          maxConnectionLifetime: 30 * 60 * 1000,
          maxConnectionPoolSize: 50,
          connectionAcquisitionTimeout: 60000,
          disableLosslessIntegers: true,
        },
      );

      await this.driver.verifyConnectivity();
      await this.createIndexes();

      logger.info({ message: 'Neo4j correlator connected' });
    } catch (error) {
      logger.error({
        message: 'Neo4j connection failed',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Set alert callback
   */
  onAlert(callback: (alert: IntelAlert) => Promise<void>): void {
    this.alertCallback = callback;
  }

  /**
   * Create necessary indexes
   */
  private async createIndexes(): Promise<void> {
    const session = this.getSession();

    try {
      // Signal node constraints
      await session.run(`
        CREATE CONSTRAINT signal_id_unique IF NOT EXISTS
        FOR (s:Signal) REQUIRE s.id IS UNIQUE
      `);

      // Track node constraints
      await session.run(`
        CREATE CONSTRAINT track_id_unique IF NOT EXISTS
        FOR (t:Track) REQUIRE t.id IS UNIQUE
      `);

      // Spatial index for geolocation queries
      await session.run(`
        CREATE INDEX signal_location_idx IF NOT EXISTS
        FOR (s:Signal) ON (s.latitude, s.longitude)
      `);

      await session.run(`
        CREATE INDEX track_location_idx IF NOT EXISTS
        FOR (t:Track) ON (t.latitude, t.longitude)
      `);

      // Temporal index
      await session.run(`
        CREATE INDEX signal_timestamp_idx IF NOT EXISTS
        FOR (s:Signal) ON (s.timestamp)
      `);

      // Frequency index for SIGINT correlation
      await session.run(`
        CREATE INDEX signal_frequency_idx IF NOT EXISTS
        FOR (s:Signal) ON (s.centerFrequencyHz)
      `);

      logger.info({ message: 'Neo4j indexes created' });
    } finally {
      await session.close();
    }
  }

  /**
   * Get session
   */
  private getSession(): Session {
    if (!this.driver) {
      throw new Error('Neo4j driver not initialized');
    }
    return this.driver.session();
  }

  /**
   * Store signal in graph
   */
  async storeSignal(signal: SignalOfInterest, tenantId: string): Promise<void> {
    const session = this.getSession();

    try {
      const location = signal.detectionLocations[0];

      await session.run(
        `
        MERGE (s:Signal {id: $signalId})
        SET s.tenantId = $tenantId,
            s.centerFrequencyHz = $centerFreq,
            s.bandwidthHz = $bandwidth,
            s.modulationType = $modulation,
            s.latitude = $latitude,
            s.longitude = $longitude,
            s.firstSeenAt = datetime($firstSeen),
            s.lastSeenAt = datetime($lastSeen),
            s.threatLevel = $threatLevel,
            s.updatedAt = datetime()
        `,
        {
          signalId: signal.id,
          tenantId,
          centerFreq: signal.waveform.centerFrequencyHz,
          bandwidth: signal.waveform.bandwidthHz,
          modulation: signal.waveform.modulationType,
          latitude: location?.latitude || 0,
          longitude: location?.longitude || 0,
          firstSeen: signal.firstSeenAt.toISOString(),
          lastSeen: signal.lastSeenAt.toISOString(),
          threatLevel: signal.threatAssessment.level,
        },
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Store track in graph
   */
  async storeTrack(track: FusedTrack, tenantId: string): Promise<void> {
    const session = this.getSession();

    try {
      await session.run(
        `
        MERGE (t:Track {id: $trackId})
        SET t.tenantId = $tenantId,
            t.trackNumber = $trackNumber,
            t.domain = $domain,
            t.category = $category,
            t.latitude = $latitude,
            t.longitude = $longitude,
            t.altitude = $altitude,
            t.heading = $heading,
            t.speed = $speed,
            t.state = $state,
            t.confidence = $confidence,
            t.updatedAt = datetime()
        `,
        {
          trackId: track.id,
          tenantId,
          trackNumber: track.trackNumber,
          domain: track.classification.domain,
          category: track.classification.category,
          latitude: track.kinematicState.position.latitude,
          longitude: track.kinematicState.position.longitude,
          altitude: track.kinematicState.position.altitudeM || 0,
          heading: track.kinematicState.headingDeg,
          speed: track.kinematicState.speedMps,
          state: track.state,
          confidence: track.fusionConfidence,
        },
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Correlate signal with entities in graph
   */
  async correlateSignal(
    signal: SignalOfInterest,
    tenantId: string,
  ): Promise<EntityCorrelation[]> {
    // Check cache
    const cacheKey = `signal:${signal.id}`;
    const cached = this.correlationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.config.cacheResultsMs) {
      return cached.result;
    }

    const correlations: EntityCorrelation[] = [];
    const session = this.getSession();

    try {
      // Spatial correlation - find entities near signal location
      if (signal.detectionLocations.length > 0) {
        const spatialCorrelations = await this.findSpatialCorrelations(
          session,
          signal.detectionLocations[0],
          tenantId,
        );
        correlations.push(...spatialCorrelations);
      }

      // Frequency correlation - find entities with similar RF characteristics
      const frequencyCorrelations = await this.findFrequencyCorrelations(
        session,
        signal.waveform.centerFrequencyHz,
        signal.waveform.bandwidthHz,
        tenantId,
      );
      correlations.push(...frequencyCorrelations);

      // Graph path correlation - find connected entities
      const graphCorrelations = await this.findGraphCorrelations(
        session,
        signal.id,
        tenantId,
      );
      correlations.push(...graphCorrelations);

      // Filter by minimum score
      const filtered = correlations.filter(
        (c) => c.correlationScore >= this.config.minCorrelationScore,
      );

      // Cache results
      this.correlationCache.set(cacheKey, {
        result: filtered,
        timestamp: Date.now(),
      });

      // Check ODNI gaps
      if (this.config.enableOdniGapMatching) {
        await this.checkOdniGaps(signal, filtered);
      }

      return filtered;
    } finally {
      await session.close();
    }
  }

  /**
   * Correlate track with entities
   */
  async correlateTrack(
    track: FusedTrack,
    tenantId: string,
  ): Promise<EntityCorrelation[]> {
    const cacheKey = `track:${track.id}`;
    const cached = this.correlationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.config.cacheResultsMs) {
      return cached.result;
    }

    const correlations: EntityCorrelation[] = [];
    const session = this.getSession();

    try {
      // Spatial correlation
      const spatialCorrelations = await this.findSpatialCorrelations(
        session,
        track.kinematicState.position,
        tenantId,
      );
      correlations.push(...spatialCorrelations);

      // Domain-based correlation
      const domainCorrelations = await this.findDomainCorrelations(
        session,
        track.classification.domain,
        track.classification.category,
        tenantId,
      );
      correlations.push(...domainCorrelations);

      // Graph correlations
      const graphCorrelations = await this.findGraphCorrelations(
        session,
        track.id,
        tenantId,
      );
      correlations.push(...graphCorrelations);

      const filtered = correlations.filter(
        (c) => c.correlationScore >= this.config.minCorrelationScore,
      );

      this.correlationCache.set(cacheKey, {
        result: filtered,
        timestamp: Date.now(),
      });

      return filtered;
    } finally {
      await session.close();
    }
  }

  /**
   * Find spatially correlated entities
   */
  private async findSpatialCorrelations(
    session: Session,
    location: GeoLocation,
    tenantId: string,
  ): Promise<EntityCorrelation[]> {
    const result = await session.run(
      `
      MATCH (e:Entity {tenantId: $tenantId})
      WHERE e.latitude IS NOT NULL AND e.longitude IS NOT NULL
      WITH e,
           point({latitude: e.latitude, longitude: e.longitude}) AS entityPoint,
           point({latitude: $latitude, longitude: $longitude}) AS targetPoint
      WITH e, point.distance(entityPoint, targetPoint) AS distanceM
      WHERE distanceM < $maxDistance
      RETURN e.id AS entityId,
             e.type AS entityType,
             e.name AS entityName,
             distanceM,
             1 - (distanceM / $maxDistance) AS proximityScore
      ORDER BY distanceM
      LIMIT 20
      `,
      {
        tenantId,
        latitude: location.latitude,
        longitude: location.longitude,
        maxDistance: this.config.spatialProximityM,
      },
    );

    return result.records.map((record) => ({
      entityId: record.get('entityId'),
      entityType: record.get('entityType'),
      entityName: record.get('entityName'),
      correlationType: 'SPATIAL' as const,
      correlationScore: record.get('proximityScore'),
      pathLength: 0,
      intermediateEntities: [],
      evidenceSources: ['GEOLOCATION'],
      timestamp: new Date(),
    }));
  }

  /**
   * Find frequency-correlated entities
   */
  private async findFrequencyCorrelations(
    session: Session,
    centerFrequency: number,
    bandwidth: number,
    tenantId: string,
  ): Promise<EntityCorrelation[]> {
    const result = await session.run(
      `
      MATCH (e:Entity {tenantId: $tenantId})-[:OPERATES_ON|:USES_FREQUENCY]->(f:Frequency)
      WHERE f.minHz <= $maxFreq AND f.maxHz >= $minFreq
      WITH e, f,
           CASE
             WHEN f.centerHz IS NOT NULL
             THEN 1 - (abs(f.centerHz - $centerFreq) / $centerFreq)
             ELSE 0.5
           END AS freqMatch
      WHERE freqMatch > 0.3
      RETURN e.id AS entityId,
             e.type AS entityType,
             e.name AS entityName,
             freqMatch AS correlationScore,
             collect(f.name) AS frequencies
      ORDER BY freqMatch DESC
      LIMIT 15
      `,
      {
        tenantId,
        centerFreq: centerFrequency,
        minFreq: centerFrequency - bandwidth,
        maxFreq: centerFrequency + bandwidth,
      },
    );

    return result.records.map((record) => ({
      entityId: record.get('entityId'),
      entityType: record.get('entityType'),
      entityName: record.get('entityName'),
      correlationType: 'BEHAVIORAL' as const,
      correlationScore: record.get('correlationScore'),
      pathLength: 1,
      intermediateEntities: [],
      evidenceSources: ['FREQUENCY_ANALYSIS'],
      timestamp: new Date(),
    }));
  }

  /**
   * Find domain-correlated entities
   */
  private async findDomainCorrelations(
    session: Session,
    domain: string,
    category: string,
    tenantId: string,
  ): Promise<EntityCorrelation[]> {
    const result = await session.run(
      `
      MATCH (e:Entity {tenantId: $tenantId})
      WHERE e.domain = $domain OR e.category = $category
      WITH e,
           CASE
             WHEN e.domain = $domain AND e.category = $category THEN 1.0
             WHEN e.domain = $domain THEN 0.7
             WHEN e.category = $category THEN 0.5
             ELSE 0.3
           END AS matchScore
      WHERE matchScore > 0.4
      RETURN e.id AS entityId,
             e.type AS entityType,
             e.name AS entityName,
             matchScore AS correlationScore
      ORDER BY matchScore DESC
      LIMIT 10
      `,
      {
        tenantId,
        domain,
        category,
      },
    );

    return result.records.map((record) => ({
      entityId: record.get('entityId'),
      entityType: record.get('entityType'),
      entityName: record.get('entityName'),
      correlationType: 'BEHAVIORAL' as const,
      correlationScore: record.get('correlationScore'),
      pathLength: 0,
      intermediateEntities: [],
      evidenceSources: ['CLASSIFICATION'],
      timestamp: new Date(),
    }));
  }

  /**
   * Find graph-connected entities
   */
  private async findGraphCorrelations(
    session: Session,
    sourceId: string,
    tenantId: string,
  ): Promise<EntityCorrelation[]> {
    const result = await session.run(
      `
      MATCH (source {id: $sourceId, tenantId: $tenantId})
      MATCH path = (source)-[*1..${this.config.maxPathLength}]-(e:Entity {tenantId: $tenantId})
      WHERE source <> e
      WITH e, path, length(path) AS pathLen
      WITH e, min(pathLen) AS shortestPath, collect(path)[0] AS bestPath
      RETURN e.id AS entityId,
             e.type AS entityType,
             e.name AS entityName,
             shortestPath,
             [n IN nodes(bestPath) WHERE n.id <> $sourceId AND n.id <> e.id | n.id] AS intermediates,
             1.0 / (1 + shortestPath) AS correlationScore
      ORDER BY correlationScore DESC
      LIMIT 15
      `,
      {
        sourceId,
        tenantId,
      },
    );

    return result.records.map((record) => ({
      entityId: record.get('entityId'),
      entityType: record.get('entityType'),
      entityName: record.get('entityName'),
      correlationType: 'INDIRECT' as const,
      correlationScore: record.get('correlationScore'),
      pathLength: record.get('shortestPath'),
      intermediateEntities: record.get('intermediates') || [],
      evidenceSources: ['GRAPH_ANALYSIS'],
      timestamp: new Date(),
    }));
  }

  /**
   * Create correlation relationship
   */
  async createCorrelation(
    sourceId: string,
    targetId: string,
    correlationType: string,
    confidence: number,
    tenantId: string,
  ): Promise<void> {
    const session = this.getSession();

    try {
      await session.run(
        `
        MATCH (s {id: $sourceId, tenantId: $tenantId})
        MATCH (t:Entity {id: $targetId, tenantId: $tenantId})
        MERGE (s)-[r:CORRELATED_WITH]->(t)
        SET r.type = $correlationType,
            r.confidence = $confidence,
            r.createdAt = datetime(),
            r.source = 'INTEL_FUSION'
        `,
        {
          sourceId,
          targetId,
          correlationType,
          confidence,
          tenantId,
        },
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Check ODNI intelligence gaps
   */
  private async checkOdniGaps(
    signal: SignalOfInterest,
    correlations: EntityCorrelation[],
  ): Promise<void> {
    const matchedGaps: string[] = [];

    // Check each gap for relevance
    for (const gap of this.odniGaps.values()) {
      let matched = false;

      // Category-based matching
      switch (gap.category) {
        case 'EW':
          if (
            signal.waveform.modulationType === 'CHIRP' ||
            signal.waveform.modulationType === 'FHSS' ||
            signal.threatAssessment.level === 'HIGH' ||
            signal.threatAssessment.level === 'CRITICAL'
          ) {
            matched = true;
          }
          break;

        case 'UAS':
          if (
            signal.waveform.centerFrequencyHz >= 2400e6 &&
            signal.waveform.centerFrequencyHz <= 5800e6
          ) {
            matched = true;
          }
          break;

        case 'MARITIME':
          if (
            signal.waveform.centerFrequencyHz >= 156e6 &&
            signal.waveform.centerFrequencyHz <= 174e6
          ) {
            matched = true;
          }
          break;

        case 'SPECTRUM':
          // All signals contribute to spectrum awareness
          matched = signal.occurrenceCount >= 3;
          break;
      }

      if (matched) {
        matchedGaps.push(gap.gapId);
        gap.matchedSignals.push(signal.id);
        gap.lastAssessedAt = new Date();
      }
    }

    // Generate alert for ODNI gap hits
    if (matchedGaps.length > 0 && this.alertCallback) {
      await this.alertCallback({
        id: uuidv4(),
        type: 'ODNI_GAP_HIT',
        priority: 'HIGH',
        title: 'Intelligence gap coverage',
        description: `Signal ${signal.id} addresses ${matchedGaps.length} ODNI gap(s): ${matchedGaps.join(', ')}`,
        source: 'CORRELATION',
        relatedEntityIds: correlations.map((c) => c.entityId),
        relatedSignalIds: [signal.id],
        relatedTrackIds: [],
        odniGapReferences: matchedGaps,
        geolocation: signal.detectionLocations[0],
        timestamp: new Date(),
        acknowledged: false,
      });
    }
  }

  /**
   * Get ODNI gap status
   */
  getOdniGapStatus(): OdniGapReference[] {
    return Array.from(this.odniGaps.values());
  }

  /**
   * Get gap by ID
   */
  getOdniGap(gapId: string): OdniGapReference | undefined {
    return this.odniGaps.get(gapId);
  }

  /**
   * Query for edge-denied correlation (offline mode)
   */
  async queryEdgeDenied(
    signals: SignalOfInterest[],
    tracks: FusedTrack[],
    tenantId: string,
  ): Promise<{
    signalCorrelations: Map<string, EntityCorrelation[]>;
    trackCorrelations: Map<string, EntityCorrelation[]>;
    odniGapHits: string[];
  }> {
    const signalCorrelations = new Map<string, EntityCorrelation[]>();
    const trackCorrelations = new Map<string, EntityCorrelation[]>();
    const odniGapHits: string[] = [];

    // Process in batch for edge-denied efficiency
    for (const signal of signals) {
      const correlations = await this.correlateSignal(signal, tenantId);
      signalCorrelations.set(signal.id, correlations);

      // Track gap hits
      for (const gap of this.odniGaps.values()) {
        if (gap.matchedSignals.includes(signal.id)) {
          if (!odniGapHits.includes(gap.gapId)) {
            odniGapHits.push(gap.gapId);
          }
        }
      }
    }

    for (const track of tracks) {
      const correlations = await this.correlateTrack(track, tenantId);
      trackCorrelations.set(track.id, correlations);
    }

    return { signalCorrelations, trackCorrelations, odniGapHits };
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
      logger.info({ message: 'Neo4j correlator closed' });
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; details?: Record<string, unknown> }> {
    try {
      if (!this.driver) {
        return { status: 'disconnected' };
      }

      const session = this.getSession();
      const result = await session.run('RETURN 1 as health');
      await session.close();

      return {
        status: 'healthy',
        details: {
          cacheSize: this.correlationCache.size,
          odniGapsLoaded: this.odniGaps.size,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
}

export default Neo4jCorrelator;
