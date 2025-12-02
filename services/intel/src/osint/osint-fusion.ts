/**
 * OSINT/CTI Fusion Engine
 *
 * Integrates Open Source Intelligence and Cyber Threat Intelligence
 * with SIGINT/MASINT data for comprehensive situational awareness.
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { v4 as uuidv4 } from 'uuid';
import {
  OsintFeed,
  OsintIndicator,
  CtiEntry,
  SignalOfInterest,
  FusedTrack,
  EntityCorrelation,
  ConfidenceLevel,
  IntelAlert,
} from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * OSINT fusion configuration
 */
export interface OsintFusionConfig {
  maxIndicatorsPerFeed: number;
  indicatorRetentionMs: number;
  correlationThreshold: number;
  enableAutoEnrichment: boolean;
  feedPollingEnabled: boolean;
  ctiIntegrationEnabled: boolean;
}

const DEFAULT_CONFIG: OsintFusionConfig = {
  maxIndicatorsPerFeed: 10000,
  indicatorRetentionMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  correlationThreshold: 0.5,
  enableAutoEnrichment: true,
  feedPollingEnabled: true,
  ctiIntegrationEnabled: true,
};

/**
 * Correlation result between OSINT and SIGINT/MASINT
 */
export interface OsintCorrelation {
  id: string;
  signalId?: string;
  trackId?: string;
  indicatorId: string;
  indicatorType: OsintIndicator['type'];
  indicatorValue: string;
  correlationScore: number;
  correlationType: 'EXACT' | 'FUZZY' | 'CONTEXTUAL';
  ctiReferences: string[];
  timestamp: Date;
}

/**
 * OsintFusionEngine - Integrates OSINT/CTI with technical intelligence
 */
export class OsintFusionEngine {
  private config: OsintFusionConfig;
  private feeds: Map<string, OsintFeed>;
  private indicators: Map<string, OsintIndicator>;
  private ctiEntries: Map<string, CtiEntry>;
  private correlations: Map<string, OsintCorrelation[]>;
  private alertCallback?: (alert: IntelAlert) => Promise<void>;

  constructor(config: Partial<OsintFusionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.feeds = new Map();
    this.indicators = new Map();
    this.ctiEntries = new Map();
    this.correlations = new Map();

    // Start cleanup task
    this.startCleanupTask();
  }

  /**
   * Set alert callback
   */
  onAlert(callback: (alert: IntelAlert) => Promise<void>): void {
    this.alertCallback = callback;
  }

  /**
   * Register OSINT feed
   */
  registerFeed(feed: OsintFeed): void {
    this.feeds.set(feed.id, feed);
    logger.info({
      message: 'OSINT feed registered',
      feedId: feed.id,
      feedName: feed.name,
      type: feed.type,
    });
  }

  /**
   * Unregister feed
   */
  unregisterFeed(feedId: string): void {
    this.feeds.delete(feedId);
    // Remove associated indicators
    for (const [id, indicator] of this.indicators) {
      if (indicator.feedId === feedId) {
        this.indicators.delete(id);
      }
    }
  }

  /**
   * Ingest indicators from feed
   */
  async ingestIndicators(
    feedId: string,
    indicators: Omit<OsintIndicator, 'id' | 'feedId'>[],
  ): Promise<number> {
    const feed = this.feeds.get(feedId);
    if (!feed) {
      throw new Error(`Feed ${feedId} not found`);
    }

    let ingested = 0;

    for (const indicatorData of indicators) {
      const indicator: OsintIndicator = {
        ...indicatorData,
        id: uuidv4(),
        feedId,
      };

      // Check for duplicate
      const existing = this.findDuplicateIndicator(indicator);
      if (existing) {
        // Update existing
        existing.lastSeenAt = indicator.lastSeenAt;
        existing.confidence = this.mergeConfidence(
          existing.confidence,
          indicator.confidence,
        );
      } else {
        this.indicators.set(indicator.id, indicator);
        ingested++;
      }
    }

    // Update feed status
    feed.lastPolledAt = new Date();
    feed.lastSuccessAt = new Date();
    feed.errorCount = 0;

    // Trim if over limit
    this.trimIndicators(feedId);

    logger.info({
      message: 'Indicators ingested',
      feedId,
      ingested,
      total: indicators.length,
    });

    return ingested;
  }

  /**
   * Ingest CTI entry
   */
  async ingestCtiEntry(entry: CtiEntry): Promise<void> {
    this.ctiEntries.set(entry.id, entry);

    // Link indicators to CTI entry
    for (const indicator of entry.indicators) {
      if (!this.indicators.has(indicator.id)) {
        this.indicators.set(indicator.id, indicator);
      }
    }

    logger.info({
      message: 'CTI entry ingested',
      entryId: entry.id,
      source: entry.source,
      indicatorCount: entry.indicators.length,
    });
  }

  /**
   * Correlate signal with OSINT indicators
   */
  async correlateSignal(
    signal: SignalOfInterest,
  ): Promise<OsintCorrelation[]> {
    const correlations: OsintCorrelation[] = [];

    // Frequency-based correlation
    const freqCorrelations = this.correlateByFrequency(signal);
    correlations.push(...freqCorrelations);

    // Location-based correlation
    if (signal.detectionLocations.length > 0) {
      const locationCorrelations = this.correlateByLocation(
        signal.detectionLocations[0],
        signal.id,
        'signal',
      );
      correlations.push(...locationCorrelations);
    }

    // Signature-based correlation
    for (const sig of signal.matchedSignatures) {
      const sigCorrelations = this.correlateBySignature(sig.signatureName, signal.id);
      correlations.push(...sigCorrelations);
    }

    // Store correlations
    if (correlations.length > 0) {
      this.correlations.set(signal.id, correlations);

      // Generate alert for high-value correlations
      const highValue = correlations.filter((c) => c.correlationScore >= 0.8);
      if (highValue.length > 0 && this.alertCallback) {
        await this.alertCallback({
          id: uuidv4(),
          type: 'CORRELATION_FOUND',
          priority: 'HIGH',
          title: 'OSINT correlation identified',
          description: `Signal ${signal.id} correlates with ${highValue.length} OSINT indicator(s)`,
          source: 'FUSION',
          relatedEntityIds: [],
          relatedSignalIds: [signal.id],
          relatedTrackIds: [],
          odniGapReferences: [],
          geolocation: signal.detectionLocations[0],
          timestamp: new Date(),
          acknowledged: false,
          metadata: {
            correlations: highValue.map((c) => ({
              indicatorType: c.indicatorType,
              indicatorValue: c.indicatorValue,
              score: c.correlationScore,
            })),
          },
        });
      }
    }

    return correlations;
  }

  /**
   * Correlate track with OSINT indicators
   */
  async correlateTrack(track: FusedTrack): Promise<OsintCorrelation[]> {
    const correlations: OsintCorrelation[] = [];

    // Location-based correlation
    const locationCorrelations = this.correlateByLocation(
      track.kinematicState.position,
      track.id,
      'track',
    );
    correlations.push(...locationCorrelations);

    // Domain/category correlation
    const domainCorrelations = this.correlateByDomain(
      track.classification.domain,
      track.classification.category,
      track.id,
    );
    correlations.push(...domainCorrelations);

    if (correlations.length > 0) {
      this.correlations.set(track.id, correlations);
    }

    return correlations;
  }

  /**
   * Correlate by frequency
   */
  private correlateByFrequency(signal: SignalOfInterest): OsintCorrelation[] {
    const correlations: OsintCorrelation[] = [];
    const freqMHz = signal.waveform.centerFrequencyHz / 1e6;

    for (const indicator of this.indicators.values()) {
      if (indicator.type === 'FREQUENCY') {
        // Parse frequency from indicator value
        const indicatorFreq = parseFloat(indicator.value);
        if (!isNaN(indicatorFreq)) {
          const diff = Math.abs(freqMHz - indicatorFreq);
          const tolerance = signal.waveform.bandwidthHz / 1e6;

          if (diff <= tolerance) {
            const score = 1 - diff / (tolerance + 1);
            if (score >= this.config.correlationThreshold) {
              correlations.push({
                id: uuidv4(),
                signalId: signal.id,
                indicatorId: indicator.id,
                indicatorType: indicator.type,
                indicatorValue: indicator.value,
                correlationScore: score,
                correlationType: diff === 0 ? 'EXACT' : 'FUZZY',
                ctiReferences: this.findCtiReferences(indicator.id),
                timestamp: new Date(),
              });
            }
          }
        }
      }
    }

    return correlations;
  }

  /**
   * Correlate by location
   */
  private correlateByLocation(
    location: { latitude: number; longitude: number },
    entityId: string,
    entityType: 'signal' | 'track',
  ): OsintCorrelation[] {
    const correlations: OsintCorrelation[] = [];

    for (const indicator of this.indicators.values()) {
      if (indicator.type === 'LOCATION') {
        // Parse location from indicator
        const [lat, lon] = indicator.value.split(',').map(parseFloat);
        if (!isNaN(lat) && !isNaN(lon)) {
          const distanceKm = this.haversineDistance(
            location.latitude,
            location.longitude,
            lat,
            lon,
          );

          // Correlate within 100km
          if (distanceKm <= 100) {
            const score = 1 - distanceKm / 100;
            if (score >= this.config.correlationThreshold) {
              correlations.push({
                id: uuidv4(),
                signalId: entityType === 'signal' ? entityId : undefined,
                trackId: entityType === 'track' ? entityId : undefined,
                indicatorId: indicator.id,
                indicatorType: indicator.type,
                indicatorValue: indicator.value,
                correlationScore: score,
                correlationType: distanceKm < 1 ? 'EXACT' : 'FUZZY',
                ctiReferences: this.findCtiReferences(indicator.id),
                timestamp: new Date(),
              });
            }
          }
        }
      }
    }

    return correlations;
  }

  /**
   * Correlate by signature name
   */
  private correlateBySignature(
    signatureName: string,
    signalId: string,
  ): OsintCorrelation[] {
    const correlations: OsintCorrelation[] = [];
    const lowerName = signatureName.toLowerCase();

    for (const indicator of this.indicators.values()) {
      const lowerValue = indicator.value.toLowerCase();
      const lowerContext = indicator.context?.toLowerCase() || '';

      // Check for name match in indicator or context
      if (lowerValue.includes(lowerName) || lowerContext.includes(lowerName)) {
        correlations.push({
          id: uuidv4(),
          signalId,
          indicatorId: indicator.id,
          indicatorType: indicator.type,
          indicatorValue: indicator.value,
          correlationScore: 0.7,
          correlationType: 'CONTEXTUAL',
          ctiReferences: this.findCtiReferences(indicator.id),
          timestamp: new Date(),
        });
      }
    }

    return correlations;
  }

  /**
   * Correlate by domain/category
   */
  private correlateByDomain(
    domain: string,
    category: string,
    trackId: string,
  ): OsintCorrelation[] {
    const correlations: OsintCorrelation[] = [];
    const searchTerms = [domain.toLowerCase(), category.toLowerCase()];

    for (const indicator of this.indicators.values()) {
      const contextLower = indicator.context?.toLowerCase() || '';
      const valueLower = indicator.value.toLowerCase();

      for (const term of searchTerms) {
        if (contextLower.includes(term) || valueLower.includes(term)) {
          correlations.push({
            id: uuidv4(),
            trackId,
            indicatorId: indicator.id,
            indicatorType: indicator.type,
            indicatorValue: indicator.value,
            correlationScore: 0.6,
            correlationType: 'CONTEXTUAL',
            ctiReferences: this.findCtiReferences(indicator.id),
            timestamp: new Date(),
          });
          break;
        }
      }
    }

    return correlations;
  }

  /**
   * Find CTI entries referencing indicator
   */
  private findCtiReferences(indicatorId: string): string[] {
    const references: string[] = [];

    for (const entry of this.ctiEntries.values()) {
      if (entry.indicators.some((i) => i.id === indicatorId)) {
        references.push(entry.id);
      }
    }

    return references;
  }

  /**
   * Find duplicate indicator
   */
  private findDuplicateIndicator(
    indicator: OsintIndicator,
  ): OsintIndicator | null {
    for (const existing of this.indicators.values()) {
      if (
        existing.type === indicator.type &&
        existing.value === indicator.value &&
        existing.feedId === indicator.feedId
      ) {
        return existing;
      }
    }
    return null;
  }

  /**
   * Merge confidence levels
   */
  private mergeConfidence(
    a: ConfidenceLevel,
    b: ConfidenceLevel,
  ): ConfidenceLevel {
    const order: Record<ConfidenceLevel, number> = {
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3,
      CONFIRMED: 4,
    };
    return order[a] >= order[b] ? a : b;
  }

  /**
   * Haversine distance calculation
   */
  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * Trim indicators for a feed
   */
  private trimIndicators(feedId: string): void {
    const feedIndicators = Array.from(this.indicators.values())
      .filter((i) => i.feedId === feedId)
      .sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime());

    if (feedIndicators.length > this.config.maxIndicatorsPerFeed) {
      const toRemove = feedIndicators.slice(this.config.maxIndicatorsPerFeed);
      for (const indicator of toRemove) {
        this.indicators.delete(indicator.id);
      }
    }
  }

  /**
   * Start cleanup task
   */
  private startCleanupTask(): void {
    setInterval(() => {
      const cutoff = Date.now() - this.config.indicatorRetentionMs;

      for (const [id, indicator] of this.indicators) {
        if (indicator.lastSeenAt.getTime() < cutoff) {
          this.indicators.delete(id);
        }
      }

      // Clean old correlations
      for (const [id, corrs] of this.correlations) {
        const valid = corrs.filter(
          (c) => c.timestamp.getTime() > cutoff,
        );
        if (valid.length === 0) {
          this.correlations.delete(id);
        } else {
          this.correlations.set(id, valid);
        }
      }
    }, 60000); // Run every minute
  }

  /**
   * Get feed status
   */
  getFeedStatus(): OsintFeed[] {
    return Array.from(this.feeds.values());
  }

  /**
   * Get indicators by type
   */
  getIndicatorsByType(type: OsintIndicator['type']): OsintIndicator[] {
    return Array.from(this.indicators.values()).filter((i) => i.type === type);
  }

  /**
   * Get CTI entries
   */
  getCtiEntries(): CtiEntry[] {
    return Array.from(this.ctiEntries.values());
  }

  /**
   * Get correlations for entity
   */
  getCorrelations(entityId: string): OsintCorrelation[] {
    return this.correlations.get(entityId) || [];
  }

  /**
   * Search indicators
   */
  searchIndicators(query: string): OsintIndicator[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.indicators.values()).filter(
      (i) =>
        i.value.toLowerCase().includes(lowerQuery) ||
        i.context?.toLowerCase().includes(lowerQuery) ||
        i.tags.some((t) => t.toLowerCase().includes(lowerQuery)),
    );
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    feedCount: number;
    indicatorCount: number;
    indicatorsByType: Record<string, number>;
    ctiEntryCount: number;
    correlationCount: number;
  } {
    const indicatorsByType: Record<string, number> = {};
    for (const indicator of this.indicators.values()) {
      indicatorsByType[indicator.type] =
        (indicatorsByType[indicator.type] || 0) + 1;
    }

    return {
      feedCount: this.feeds.size,
      indicatorCount: this.indicators.size,
      indicatorsByType,
      ctiEntryCount: this.ctiEntries.size,
      correlationCount: this.correlations.size,
    };
  }
}

export default OsintFusionEngine;
