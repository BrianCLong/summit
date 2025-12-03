/**
 * Pattern Recognition Agent
 *
 * Intelligent agent for detecting temporal, spatial, and behavioral
 * patterns across multiple signals and tracks. Implements anomaly
 * detection and pattern correlation.
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { v4 as uuidv4 } from 'uuid';
import {
  SignalOfInterest,
  FusedTrack,
  IntelAlert,
  AlertType,
  GeoLocation,
  ConfidenceLevel,
} from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Detected pattern types
 */
export type PatternType =
  | 'TEMPORAL_CORRELATION' // Signals appearing at same times
  | 'SPATIAL_CLUSTERING' // Signals in geographic proximity
  | 'BEHAVIORAL_SEQUENCE' // Ordered sequence of events
  | 'FREQUENCY_HOPPING' // Coordinated frequency changes
  | 'MOVEMENT_PATTERN' // Track movement correlation
  | 'EMISSION_CONTROL' // Coordinated EMCON
  | 'NETWORK_STRUCTURE' // Communication network patterns
  | 'ANOMALY'; // Statistical anomaly

/**
 * Detected pattern
 */
export interface DetectedPattern {
  id: string;
  type: PatternType;
  confidence: ConfidenceLevel;
  description: string;
  involvedSignals: string[];
  involvedTracks: string[];
  temporalSpan: { start: Date; end: Date };
  spatialExtent?: {
    centerLat: number;
    centerLon: number;
    radiusM: number;
  };
  features: Record<string, number | string | boolean>;
  detectedAt: Date;
  lastUpdatedAt: Date;
}

/**
 * Configuration for pattern agent
 */
export interface PatternAgentConfig {
  temporalWindowMs: number;
  spatialClusterRadiusM: number;
  minClusterSize: number;
  anomalyThresholdSigma: number;
  frequencyHopToleranceMs: number;
  patternRetentionMs: number;
  enableTemporalAnalysis: boolean;
  enableSpatialAnalysis: boolean;
  enableBehavioralAnalysis: boolean;
  enableAnomalyDetection: boolean;
}

const DEFAULT_CONFIG: PatternAgentConfig = {
  temporalWindowMs: 60000, // 1 minute
  spatialClusterRadiusM: 10000, // 10 km
  minClusterSize: 3,
  anomalyThresholdSigma: 2.5,
  frequencyHopToleranceMs: 100,
  patternRetentionMs: 3600000, // 1 hour
  enableTemporalAnalysis: true,
  enableSpatialAnalysis: true,
  enableBehavioralAnalysis: true,
  enableAnomalyDetection: true,
};

/**
 * PatternAgent - Detects patterns across signals and tracks
 */
export class PatternAgent {
  private config: PatternAgentConfig;
  private detectedPatterns: Map<string, DetectedPattern>;
  private signalHistory: Array<{
    signal: SignalOfInterest;
    timestamp: Date;
  }>;
  private trackHistory: Array<{
    track: FusedTrack;
    timestamp: Date;
  }>;
  private alertCallback?: (alert: IntelAlert) => Promise<void>;

  constructor(config: Partial<PatternAgentConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.detectedPatterns = new Map();
    this.signalHistory = [];
    this.trackHistory = [];

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
   * Analyze new signal for patterns
   */
  async analyzeSignal(signal: SignalOfInterest): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    // Add to history
    this.signalHistory.push({ signal, timestamp: new Date() });
    this.pruneHistory();

    // Run enabled analyses
    if (this.config.enableTemporalAnalysis) {
      const temporal = await this.detectTemporalPatterns(signal);
      patterns.push(...temporal);
    }

    if (this.config.enableSpatialAnalysis) {
      const spatial = await this.detectSpatialClusters(signal);
      patterns.push(...spatial);
    }

    if (this.config.enableBehavioralAnalysis) {
      const behavioral = await this.detectBehavioralPatterns(signal);
      patterns.push(...behavioral);
    }

    if (this.config.enableAnomalyDetection) {
      const anomalies = await this.detectAnomalies(signal);
      patterns.push(...anomalies);
    }

    // Store patterns and generate alerts
    for (const pattern of patterns) {
      const existing = this.findSimilarPattern(pattern);
      if (existing) {
        this.updatePattern(existing, pattern);
      } else {
        this.detectedPatterns.set(pattern.id, pattern);
        await this.generatePatternAlert(pattern);
      }
    }

    return patterns;
  }

  /**
   * Analyze track for patterns
   */
  async analyzeTrack(track: FusedTrack): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    // Add to history
    this.trackHistory.push({ track, timestamp: new Date() });
    this.pruneHistory();

    // Detect movement patterns
    const movement = await this.detectMovementPatterns(track);
    patterns.push(...movement);

    // Store and alert
    for (const pattern of patterns) {
      const existing = this.findSimilarPattern(pattern);
      if (existing) {
        this.updatePattern(existing, pattern);
      } else {
        this.detectedPatterns.set(pattern.id, pattern);
        await this.generatePatternAlert(pattern);
      }
    }

    return patterns;
  }

  /**
   * Detect temporal correlations between signals
   */
  private async detectTemporalPatterns(
    signal: SignalOfInterest,
  ): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];
    const now = signal.lastSeenAt.getTime();
    const windowStart = now - this.config.temporalWindowMs;

    // Find signals within temporal window
    const recentSignals = this.signalHistory.filter(
      (h) =>
        h.timestamp.getTime() >= windowStart &&
        h.signal.id !== signal.id,
    );

    if (recentSignals.length < this.config.minClusterSize - 1) {
      return patterns;
    }

    // Group by similar timing patterns
    const timingGroups = this.groupByTiming(
      [{ signal, timestamp: new Date(now) }, ...recentSignals],
    );

    for (const group of timingGroups) {
      if (group.length >= this.config.minClusterSize) {
        patterns.push({
          id: uuidv4(),
          type: 'TEMPORAL_CORRELATION',
          confidence: this.computeTemporalConfidence(group),
          description: `${group.length} signals correlated within ${this.config.temporalWindowMs}ms window`,
          involvedSignals: group.map((g) => g.signal.id),
          involvedTracks: [],
          temporalSpan: {
            start: new Date(Math.min(...group.map((g) => g.timestamp.getTime()))),
            end: new Date(Math.max(...group.map((g) => g.timestamp.getTime()))),
          },
          features: {
            signalCount: group.length,
            windowMs: this.config.temporalWindowMs,
            avgIntervalMs: this.computeAverageInterval(group),
          },
          detectedAt: new Date(),
          lastUpdatedAt: new Date(),
        });
      }
    }

    return patterns;
  }

  /**
   * Detect spatial clustering of signals
   */
  private async detectSpatialClusters(
    signal: SignalOfInterest,
  ): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    if (signal.detectionLocations.length === 0) {
      return patterns;
    }

    const signalLocation = signal.detectionLocations[0];

    // Find nearby signals
    const nearbySignals = this.signalHistory.filter((h) => {
      if (h.signal.id === signal.id) return false;
      if (h.signal.detectionLocations.length === 0) return false;

      const distance = this.computeDistance(
        signalLocation,
        h.signal.detectionLocations[0],
      );
      return distance <= this.config.spatialClusterRadiusM;
    });

    if (nearbySignals.length >= this.config.minClusterSize - 1) {
      const cluster = [
        { signal, timestamp: new Date() },
        ...nearbySignals,
      ];
      const centroid = this.computeCentroid(
        cluster.map((c) => c.signal.detectionLocations[0]),
      );

      patterns.push({
        id: uuidv4(),
        type: 'SPATIAL_CLUSTERING',
        confidence: this.computeSpatialConfidence(cluster),
        description: `${cluster.length} signals clustered within ${this.config.spatialClusterRadiusM}m radius`,
        involvedSignals: cluster.map((c) => c.signal.id),
        involvedTracks: [],
        temporalSpan: {
          start: new Date(
            Math.min(...cluster.map((c) => c.signal.firstSeenAt.getTime())),
          ),
          end: new Date(
            Math.max(...cluster.map((c) => c.signal.lastSeenAt.getTime())),
          ),
        },
        spatialExtent: {
          centerLat: centroid.latitude,
          centerLon: centroid.longitude,
          radiusM: this.config.spatialClusterRadiusM,
        },
        features: {
          signalCount: cluster.length,
          radiusM: this.config.spatialClusterRadiusM,
          clusterDensity: cluster.length / (Math.PI * Math.pow(this.config.spatialClusterRadiusM / 1000, 2)),
        },
        detectedAt: new Date(),
        lastUpdatedAt: new Date(),
      });
    }

    return patterns;
  }

  /**
   * Detect behavioral patterns (sequences, EMCON, etc.)
   */
  private async detectBehavioralPatterns(
    signal: SignalOfInterest,
  ): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    // Detect frequency hopping pattern
    const hopPattern = this.detectFrequencyHopping(signal);
    if (hopPattern) {
      patterns.push(hopPattern);
    }

    // Detect emission control pattern
    const emconPattern = this.detectEmissionControl(signal);
    if (emconPattern) {
      patterns.push(emconPattern);
    }

    return patterns;
  }

  /**
   * Detect frequency hopping behavior
   */
  private detectFrequencyHopping(
    signal: SignalOfInterest,
  ): DetectedPattern | null {
    // Look for signals with same characteristics but different frequencies
    const candidates = this.signalHistory.filter((h) => {
      if (h.signal.id === signal.id) return false;

      // Same modulation but different frequency
      const sameMod =
        h.signal.waveform.modulationType === signal.waveform.modulationType;
      const diffFreq =
        Math.abs(
          h.signal.waveform.centerFrequencyHz - signal.waveform.centerFrequencyHz,
        ) > signal.waveform.bandwidthHz;

      // Within timing tolerance
      const timeDiff = Math.abs(
        h.signal.lastSeenAt.getTime() - signal.lastSeenAt.getTime(),
      );
      const withinTolerance = timeDiff <= this.config.frequencyHopToleranceMs;

      return sameMod && diffFreq && withinTolerance;
    });

    if (candidates.length >= 2) {
      const involved = [
        { signal, timestamp: new Date() },
        ...candidates,
      ];

      return {
        id: uuidv4(),
        type: 'FREQUENCY_HOPPING',
        confidence: 'MEDIUM',
        description: `Detected frequency hopping across ${involved.length} channels`,
        involvedSignals: involved.map((i) => i.signal.id),
        involvedTracks: [],
        temporalSpan: {
          start: new Date(
            Math.min(...involved.map((i) => i.signal.firstSeenAt.getTime())),
          ),
          end: new Date(
            Math.max(...involved.map((i) => i.signal.lastSeenAt.getTime())),
          ),
        },
        features: {
          channelCount: involved.length,
          modulationType: signal.waveform.modulationType,
          hopIntervalMs: this.config.frequencyHopToleranceMs,
        },
        detectedAt: new Date(),
        lastUpdatedAt: new Date(),
      };
    }

    return null;
  }

  /**
   * Detect emission control (EMCON) patterns
   */
  private detectEmissionControl(
    signal: SignalOfInterest,
  ): DetectedPattern | null {
    // Look for coordinated on/off patterns
    if (signal.occurrenceCount < 3) return null;

    // Check if signal has regular on/off periods
    const avgDuration = signal.averageDurationMs;
    const totalTime =
      signal.lastSeenAt.getTime() - signal.firstSeenAt.getTime();
    const dutyCycle =
      (avgDuration * signal.occurrenceCount) / (totalTime || 1);

    // EMCON typically shows low duty cycle with regular patterns
    if (dutyCycle < 0.3 && signal.occurrenceCount >= 3) {
      return {
        id: uuidv4(),
        type: 'EMISSION_CONTROL',
        confidence: 'LOW',
        description: `Potential EMCON pattern detected - ${(dutyCycle * 100).toFixed(1)}% duty cycle`,
        involvedSignals: [signal.id],
        involvedTracks: [],
        temporalSpan: {
          start: signal.firstSeenAt,
          end: signal.lastSeenAt,
        },
        features: {
          dutyCycle,
          occurrenceCount: signal.occurrenceCount,
          avgDurationMs: avgDuration,
        },
        detectedAt: new Date(),
        lastUpdatedAt: new Date(),
      };
    }

    return null;
  }

  /**
   * Detect anomalies using statistical analysis
   */
  private async detectAnomalies(
    signal: SignalOfInterest,
  ): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    // Compute signal statistics
    const stats = this.computeSignalStatistics();
    if (!stats) return patterns;

    // Check for frequency anomaly
    const freqZScore =
      (signal.waveform.centerFrequencyHz - stats.meanFrequency) /
      (stats.stdFrequency || 1);
    if (Math.abs(freqZScore) > this.config.anomalyThresholdSigma) {
      patterns.push({
        id: uuidv4(),
        type: 'ANOMALY',
        confidence: 'MEDIUM',
        description: `Frequency anomaly detected: ${freqZScore.toFixed(1)} sigma from mean`,
        involvedSignals: [signal.id],
        involvedTracks: [],
        temporalSpan: {
          start: signal.firstSeenAt,
          end: signal.lastSeenAt,
        },
        features: {
          anomalyType: 'FREQUENCY',
          zScore: freqZScore,
          observedValue: signal.waveform.centerFrequencyHz,
          expectedMean: stats.meanFrequency,
        },
        detectedAt: new Date(),
        lastUpdatedAt: new Date(),
      });
    }

    // Check for bandwidth anomaly
    const bwZScore =
      (signal.waveform.bandwidthHz - stats.meanBandwidth) /
      (stats.stdBandwidth || 1);
    if (Math.abs(bwZScore) > this.config.anomalyThresholdSigma) {
      patterns.push({
        id: uuidv4(),
        type: 'ANOMALY',
        confidence: 'MEDIUM',
        description: `Bandwidth anomaly detected: ${bwZScore.toFixed(1)} sigma from mean`,
        involvedSignals: [signal.id],
        involvedTracks: [],
        temporalSpan: {
          start: signal.firstSeenAt,
          end: signal.lastSeenAt,
        },
        features: {
          anomalyType: 'BANDWIDTH',
          zScore: bwZScore,
          observedValue: signal.waveform.bandwidthHz,
          expectedMean: stats.meanBandwidth,
        },
        detectedAt: new Date(),
        lastUpdatedAt: new Date(),
      });
    }

    return patterns;
  }

  /**
   * Detect movement patterns in tracks
   */
  private async detectMovementPatterns(
    track: FusedTrack,
  ): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    // Find tracks with similar movement characteristics
    const similarTracks = this.trackHistory.filter((h) => {
      if (h.track.id === track.id) return false;

      // Similar heading (within 30 degrees)
      const headingDiff = Math.abs(
        h.track.kinematicState.headingDeg - track.kinematicState.headingDeg,
      );
      const similarHeading = headingDiff < 30 || headingDiff > 330;

      // Similar speed (within 20%)
      const speedRatio =
        h.track.kinematicState.speedMps / (track.kinematicState.speedMps || 1);
      const similarSpeed = speedRatio > 0.8 && speedRatio < 1.2;

      return similarHeading && similarSpeed;
    });

    if (similarTracks.length >= this.config.minClusterSize - 1) {
      const group = [{ track, timestamp: new Date() }, ...similarTracks];

      patterns.push({
        id: uuidv4(),
        type: 'MOVEMENT_PATTERN',
        confidence: 'MEDIUM',
        description: `${group.length} tracks with coordinated movement`,
        involvedSignals: [],
        involvedTracks: group.map((g) => g.track.id),
        temporalSpan: {
          start: new Date(
            Math.min(...group.map((g) => g.track.firstDetectionAt.getTime())),
          ),
          end: new Date(
            Math.max(...group.map((g) => g.track.lastUpdateAt.getTime())),
          ),
        },
        features: {
          trackCount: group.length,
          avgHeading: track.kinematicState.headingDeg,
          avgSpeed: track.kinematicState.speedMps,
        },
        detectedAt: new Date(),
        lastUpdatedAt: new Date(),
      });
    }

    return patterns;
  }

  /**
   * Group signals by timing similarity
   */
  private groupByTiming(
    signals: Array<{ signal: SignalOfInterest; timestamp: Date }>,
  ): Array<Array<{ signal: SignalOfInterest; timestamp: Date }>> {
    const groups: Array<Array<{ signal: SignalOfInterest; timestamp: Date }>> = [];
    const used = new Set<string>();

    for (const item of signals) {
      if (used.has(item.signal.id)) continue;

      const group = signals.filter((other) => {
        if (used.has(other.signal.id)) return false;
        const timeDiff = Math.abs(
          item.timestamp.getTime() - other.timestamp.getTime(),
        );
        return timeDiff <= this.config.temporalWindowMs;
      });

      if (group.length >= this.config.minClusterSize) {
        groups.push(group);
        group.forEach((g) => used.add(g.signal.id));
      }
    }

    return groups;
  }

  /**
   * Compute average interval between signals
   */
  private computeAverageInterval(
    signals: Array<{ signal: SignalOfInterest; timestamp: Date }>,
  ): number {
    if (signals.length < 2) return 0;

    const sorted = [...signals].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
    let totalInterval = 0;

    for (let i = 1; i < sorted.length; i++) {
      totalInterval +=
        sorted[i].timestamp.getTime() - sorted[i - 1].timestamp.getTime();
    }

    return totalInterval / (sorted.length - 1);
  }

  /**
   * Compute haversine distance between two geolocations
   */
  private computeDistance(a: GeoLocation, b: GeoLocation): number {
    const R = 6371000; // Earth radius in meters
    const lat1 = (a.latitude * Math.PI) / 180;
    const lat2 = (b.latitude * Math.PI) / 180;
    const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
    const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;

    const h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    return 2 * R * Math.asin(Math.sqrt(h));
  }

  /**
   * Compute centroid of locations
   */
  private computeCentroid(locations: GeoLocation[]): GeoLocation {
    if (locations.length === 0) {
      return { latitude: 0, longitude: 0, accuracyM: 0, timestamp: new Date(), source: 'ESTIMATED' };
    }

    const avgLat =
      locations.reduce((sum, l) => sum + l.latitude, 0) / locations.length;
    const avgLon =
      locations.reduce((sum, l) => sum + l.longitude, 0) / locations.length;

    return {
      latitude: avgLat,
      longitude: avgLon,
      accuracyM: Math.max(...locations.map((l) => l.accuracyM)),
      timestamp: new Date(),
      source: 'ESTIMATED',
    };
  }

  /**
   * Compute temporal correlation confidence
   */
  private computeTemporalConfidence(
    signals: Array<{ signal: SignalOfInterest; timestamp: Date }>,
  ): ConfidenceLevel {
    if (signals.length >= 5) return 'HIGH';
    if (signals.length >= 3) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Compute spatial clustering confidence
   */
  private computeSpatialConfidence(
    signals: Array<{ signal: SignalOfInterest; timestamp: Date }>,
  ): ConfidenceLevel {
    if (signals.length >= 5) return 'HIGH';
    if (signals.length >= 3) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Compute signal statistics for anomaly detection
   */
  private computeSignalStatistics(): {
    meanFrequency: number;
    stdFrequency: number;
    meanBandwidth: number;
    stdBandwidth: number;
  } | null {
    if (this.signalHistory.length < 10) return null;

    const frequencies = this.signalHistory.map(
      (h) => h.signal.waveform.centerFrequencyHz,
    );
    const bandwidths = this.signalHistory.map(
      (h) => h.signal.waveform.bandwidthHz,
    );

    return {
      meanFrequency: this.mean(frequencies),
      stdFrequency: this.std(frequencies),
      meanBandwidth: this.mean(bandwidths),
      stdBandwidth: this.std(bandwidths),
    };
  }

  /**
   * Compute mean
   */
  private mean(values: number[]): number {
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * Compute standard deviation
   */
  private std(values: number[]): number {
    const m = this.mean(values);
    const variance =
      values.reduce((sum, v) => sum + Math.pow(v - m, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Find similar existing pattern
   */
  private findSimilarPattern(pattern: DetectedPattern): DetectedPattern | null {
    for (const existing of this.detectedPatterns.values()) {
      if (existing.type !== pattern.type) continue;

      // Check for overlapping signals/tracks
      const signalOverlap = pattern.involvedSignals.filter((s) =>
        existing.involvedSignals.includes(s),
      );
      const trackOverlap = pattern.involvedTracks.filter((t) =>
        existing.involvedTracks.includes(t),
      );

      const overlapRatio =
        (signalOverlap.length + trackOverlap.length) /
        Math.max(
          pattern.involvedSignals.length + pattern.involvedTracks.length,
          1,
        );

      if (overlapRatio > 0.5) {
        return existing;
      }
    }

    return null;
  }

  /**
   * Update existing pattern
   */
  private updatePattern(
    existing: DetectedPattern,
    newPattern: DetectedPattern,
  ): void {
    // Merge involved entities
    for (const signal of newPattern.involvedSignals) {
      if (!existing.involvedSignals.includes(signal)) {
        existing.involvedSignals.push(signal);
      }
    }
    for (const track of newPattern.involvedTracks) {
      if (!existing.involvedTracks.includes(track)) {
        existing.involvedTracks.push(track);
      }
    }

    // Update temporal span
    existing.temporalSpan.start = new Date(
      Math.min(
        existing.temporalSpan.start.getTime(),
        newPattern.temporalSpan.start.getTime(),
      ),
    );
    existing.temporalSpan.end = new Date(
      Math.max(
        existing.temporalSpan.end.getTime(),
        newPattern.temporalSpan.end.getTime(),
      ),
    );

    existing.lastUpdatedAt = new Date();
    this.detectedPatterns.set(existing.id, existing);
  }

  /**
   * Generate alert for new pattern
   */
  private async generatePatternAlert(pattern: DetectedPattern): Promise<void> {
    if (!this.alertCallback) return;

    const alert: IntelAlert = {
      id: uuidv4(),
      type: 'PATTERN_MATCH',
      priority: this.patternToPriority(pattern),
      title: `Pattern detected: ${pattern.type}`,
      description: pattern.description,
      source: 'FUSION',
      relatedEntityIds: [],
      relatedSignalIds: pattern.involvedSignals,
      relatedTrackIds: pattern.involvedTracks,
      odniGapReferences: [],
      timestamp: new Date(),
      acknowledged: false,
    };

    await this.alertCallback(alert);
  }

  /**
   * Map pattern to alert priority
   */
  private patternToPriority(pattern: DetectedPattern): IntelAlert['priority'] {
    const typeMapping: Record<PatternType, IntelAlert['priority']> = {
      TEMPORAL_CORRELATION: 'MEDIUM',
      SPATIAL_CLUSTERING: 'MEDIUM',
      BEHAVIORAL_SEQUENCE: 'HIGH',
      FREQUENCY_HOPPING: 'HIGH',
      MOVEMENT_PATTERN: 'MEDIUM',
      EMISSION_CONTROL: 'HIGH',
      NETWORK_STRUCTURE: 'HIGH',
      ANOMALY: 'MEDIUM',
    };

    return typeMapping[pattern.type] || 'LOW';
  }

  /**
   * Prune old history entries
   */
  private pruneHistory(): void {
    const cutoff = Date.now() - this.config.patternRetentionMs;

    this.signalHistory = this.signalHistory.filter(
      (h) => h.timestamp.getTime() > cutoff,
    );
    this.trackHistory = this.trackHistory.filter(
      (h) => h.timestamp.getTime() > cutoff,
    );
  }

  /**
   * Start periodic cleanup
   */
  private startCleanupTask(): void {
    setInterval(() => {
      const cutoff = Date.now() - this.config.patternRetentionMs;

      for (const [id, pattern] of this.detectedPatterns) {
        if (pattern.lastUpdatedAt.getTime() < cutoff) {
          this.detectedPatterns.delete(id);
        }
      }
    }, 60000);
  }

  /**
   * Get all detected patterns
   */
  getPatterns(): DetectedPattern[] {
    return Array.from(this.detectedPatterns.values());
  }

  /**
   * Get pattern by ID
   */
  getPattern(id: string): DetectedPattern | undefined {
    return this.detectedPatterns.get(id);
  }

  /**
   * Get patterns by type
   */
  getPatternsByType(type: PatternType): DetectedPattern[] {
    return Array.from(this.detectedPatterns.values()).filter(
      (p) => p.type === type,
    );
  }
}

export default PatternAgent;
