/**
 * SIGINT Spectrum Analyzer Service
 *
 * Orchestrates spectrum analysis pipeline for signals intelligence.
 * Processes raw RF data through waveform decoding, signal detection,
 * and threat assessment.
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { v4 as uuidv4 } from 'uuid';
import { WaveformDecoder, WaveformDecoderConfig } from './waveform-decoder.js';
import {
  SpectrumSample,
  SignalOfInterest,
  WaveformCharacteristics,
  ThreatAssessment,
  SignatureMatch,
  GeoLocation,
  ConfidenceLevel,
  IntelAlert,
  AlertType,
  AlertPriority,
} from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Configuration for spectrum analyzer
 */
export interface SpectrumAnalyzerConfig {
  waveformDecoder: Partial<WaveformDecoderConfig>;
  signalDetectionThresholdDb: number;
  minSignalDurationMs: number;
  maxConcurrentAnalyses: number;
  soiRetentionMs: number;
  enableGeolocation: boolean;
  enableThreatAssessment: boolean;
}

const DEFAULT_CONFIG: SpectrumAnalyzerConfig = {
  waveformDecoder: {},
  signalDetectionThresholdDb: 6,
  minSignalDurationMs: 10,
  maxConcurrentAnalyses: 10,
  soiRetentionMs: 3600000, // 1 hour
  enableGeolocation: true,
  enableThreatAssessment: true,
};

/**
 * SpectrumAnalyzer - Main service for SIGINT spectrum analysis
 */
export class SpectrumAnalyzer {
  private config: SpectrumAnalyzerConfig;
  private waveformDecoder: WaveformDecoder;
  private activeSignals: Map<string, SignalOfInterest>;
  private analysisQueue: Array<{
    samples: SpectrumSample[];
    sampleRate: number;
    resolve: (value: SignalOfInterest | null) => void;
    reject: (error: Error) => void;
  }>;
  private processing: boolean;
  private alertCallback?: (alert: IntelAlert) => Promise<void>;
  private signatureMatchCallback?: (
    waveform: WaveformCharacteristics,
  ) => Promise<SignatureMatch[]>;

  constructor(config: Partial<SpectrumAnalyzerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.waveformDecoder = new WaveformDecoder(this.config.waveformDecoder);
    this.activeSignals = new Map();
    this.analysisQueue = [];
    this.processing = false;

    // Start periodic cleanup
    this.startCleanupTask();
  }

  /**
   * Set callback for alerts generated during analysis
   */
  onAlert(callback: (alert: IntelAlert) => Promise<void>): void {
    this.alertCallback = callback;
  }

  /**
   * Set callback for signature matching
   */
  onSignatureMatch(
    callback: (waveform: WaveformCharacteristics) => Promise<SignatureMatch[]>,
  ): void {
    this.signatureMatchCallback = callback;
  }

  /**
   * Process spectrum samples and detect signals of interest
   */
  async processSpectrum(
    samples: SpectrumSample[],
    sampleRate: number,
  ): Promise<SignalOfInterest | null> {
    return new Promise((resolve, reject) => {
      this.analysisQueue.push({ samples, sampleRate, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Process queued analysis requests
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.analysisQueue.length > 0) {
      const batch = this.analysisQueue.splice(
        0,
        this.config.maxConcurrentAnalyses,
      );

      const results = await Promise.allSettled(
        batch.map((item) => this.analyzeSignal(item.samples, item.sampleRate)),
      );

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          batch[index].resolve(result.value);
        } else {
          batch[index].reject(new Error(result.reason));
        }
      });
    }

    this.processing = false;
  }

  /**
   * Analyze samples for signal detection
   */
  private async analyzeSignal(
    samples: SpectrumSample[],
    sampleRate: number,
  ): Promise<SignalOfInterest | null> {
    const startTime = Date.now();

    try {
      // Check if signal exceeds detection threshold
      const signalPresent = this.detectSignalPresence(samples);
      if (!signalPresent) {
        return null;
      }

      // Decode waveform characteristics
      const waveform = await this.waveformDecoder.analyzeWaveform(
        samples,
        sampleRate,
      );

      // Match against signature database
      const signatures = this.signatureMatchCallback
        ? await this.signatureMatchCallback(waveform)
        : [];

      // Check for existing SOI with similar characteristics
      const existingSoi = this.findSimilarSignal(waveform);

      if (existingSoi) {
        // Update existing signal
        return this.updateExistingSignal(existingSoi, waveform, samples, signatures);
      }

      // Create new Signal of Interest
      const soi = await this.createNewSignal(waveform, samples, signatures);

      // Generate alert for new signal
      if (this.alertCallback) {
        const alert = this.generateNewSignalAlert(soi);
        await this.alertCallback(alert);
      }

      const analysisTime = Date.now() - startTime;
      logger.info({
        message: 'New signal of interest detected',
        soiId: soi.id,
        centerFrequency: waveform.centerFrequencyHz,
        modulation: waveform.modulationType,
        analysisTimeMs: analysisTime,
      });

      return soi;
    } catch (error) {
      logger.error({
        message: 'Signal analysis failed',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Detect if signal is present above noise floor
   */
  private detectSignalPresence(samples: SpectrumSample[]): boolean {
    if (samples.length === 0) return false;

    // Calculate signal-to-noise ratio
    const avgPower =
      samples.reduce((sum, s) => sum + s.powerDbm, 0) / samples.length;
    const avgNoise =
      samples.reduce((sum, s) => sum + s.noiseFloorDbm, 0) / samples.length;
    const snr = avgPower - avgNoise;

    // Check duration
    const duration =
      samples[samples.length - 1].timestamp.getTime() -
      samples[0].timestamp.getTime();

    return (
      snr >= this.config.signalDetectionThresholdDb &&
      duration >= this.config.minSignalDurationMs
    );
  }

  /**
   * Find existing signal with similar characteristics
   */
  private findSimilarSignal(
    waveform: WaveformCharacteristics,
  ): SignalOfInterest | null {
    const frequencyTolerance = 0.001; // 0.1%
    const bandwidthTolerance = 0.1; // 10%

    for (const soi of this.activeSignals.values()) {
      const freqMatch =
        Math.abs(soi.waveform.centerFrequencyHz - waveform.centerFrequencyHz) /
          waveform.centerFrequencyHz <
        frequencyTolerance;
      const bwMatch =
        Math.abs(soi.waveform.bandwidthHz - waveform.bandwidthHz) /
          (waveform.bandwidthHz + 1) <
        bandwidthTolerance;
      const modMatch = soi.waveform.modulationType === waveform.modulationType;

      if (freqMatch && bwMatch && modMatch) {
        return soi;
      }
    }

    return null;
  }

  /**
   * Update existing signal with new observation
   */
  private updateExistingSignal(
    existing: SignalOfInterest,
    waveform: WaveformCharacteristics,
    samples: SpectrumSample[],
    signatures: SignatureMatch[],
  ): SignalOfInterest {
    const now = new Date();
    const duration =
      samples[samples.length - 1].timestamp.getTime() -
      samples[0].timestamp.getTime();

    // Update statistics
    existing.occurrenceCount++;
    existing.lastSeenAt = now;
    existing.averageDurationMs =
      (existing.averageDurationMs * (existing.occurrenceCount - 1) + duration) /
      existing.occurrenceCount;

    // Add new detection location if present
    const location = this.extractLocation(samples);
    if (location && this.config.enableGeolocation) {
      existing.detectionLocations.push(location);
      // Keep last 100 locations
      if (existing.detectionLocations.length > 100) {
        existing.detectionLocations.shift();
      }
    }

    // Update signatures if new matches found
    for (const sig of signatures) {
      if (!existing.matchedSignatures.some((s) => s.signatureId === sig.signatureId)) {
        existing.matchedSignatures.push(sig);
      }
    }

    // Update waveform if confidence improved
    if (this.compareConfidence(waveform.confidence, existing.waveform.confidence) > 0) {
      existing.waveform = waveform;
    }

    this.activeSignals.set(existing.id, existing);
    return existing;
  }

  /**
   * Create new Signal of Interest
   */
  private async createNewSignal(
    waveform: WaveformCharacteristics,
    samples: SpectrumSample[],
    signatures: SignatureMatch[],
  ): Promise<SignalOfInterest> {
    const now = new Date();
    const location = this.extractLocation(samples);
    const duration =
      samples[samples.length - 1].timestamp.getTime() -
      samples[0].timestamp.getTime();

    const threatAssessment = this.config.enableThreatAssessment
      ? this.assessThreat(waveform, signatures)
      : this.defaultThreatAssessment();

    const soi: SignalOfInterest = {
      id: uuidv4(),
      waveform,
      firstSeenAt: samples[0].timestamp,
      lastSeenAt: now,
      occurrenceCount: 1,
      averageDurationMs: duration,
      detectionLocations: location ? [location] : [],
      threatAssessment,
      matchedSignatures: signatures,
      correlatedEntities: [],
      odniGapReferences: [],
    };

    this.activeSignals.set(soi.id, soi);
    return soi;
  }

  /**
   * Extract geolocation from samples
   */
  private extractLocation(samples: SpectrumSample[]): GeoLocation | null {
    // Find sample with best accuracy
    const locatedSamples = samples.filter((s) => s.geolocation);
    if (locatedSamples.length === 0) return null;

    return locatedSamples.reduce((best, current) =>
      current.geolocation!.accuracyM < (best.geolocation?.accuracyM ?? Infinity)
        ? current
        : best,
    ).geolocation!;
  }

  /**
   * Assess threat level based on signal characteristics
   */
  private assessThreat(
    waveform: WaveformCharacteristics,
    signatures: SignatureMatch[],
  ): ThreatAssessment {
    const indicators: ThreatAssessment['indicators'] = [];
    let threatScore = 0;

    // Check for known threat signatures
    const threatSignatures = signatures.filter(
      (s) => s.matchScore > 0.7,
    );
    if (threatSignatures.length > 0) {
      threatScore += 30;
      indicators.push({
        type: 'SIGNATURE_MATCH',
        description: `Matched ${threatSignatures.length} known signatures`,
        weight: 0.3,
        source: 'SIGINT',
        evidenceIds: threatSignatures.map((s) => s.signatureId),
      });
    }

    // Check for suspicious modulation types
    const suspiciousModulations: WaveformCharacteristics['modulationType'][] = [
      'FHSS',
      'DSSS',
      'CHIRP',
    ];
    if (suspiciousModulations.includes(waveform.modulationType)) {
      threatScore += 15;
      indicators.push({
        type: 'MODULATION_ANALYSIS',
        description: `Detected ${waveform.modulationType} modulation`,
        weight: 0.15,
        source: 'SIGINT',
        evidenceIds: [waveform.id],
      });
    }

    // Check for military band operation
    const militaryBands = this.checkMilitaryBands(waveform.centerFrequencyHz);
    if (militaryBands.length > 0) {
      threatScore += 20;
      indicators.push({
        type: 'FREQUENCY_BAND',
        description: `Operating in ${militaryBands.join(', ')} band(s)`,
        weight: 0.2,
        source: 'SIGINT',
        evidenceIds: [waveform.id],
      });
    }

    // Determine threat level
    let level: ThreatAssessment['level'];
    if (threatScore >= 60) level = 'CRITICAL';
    else if (threatScore >= 45) level = 'HIGH';
    else if (threatScore >= 30) level = 'MEDIUM';
    else if (threatScore >= 15) level = 'LOW';
    else level = 'NONE';

    return {
      level,
      category: 'ELECTRONIC_EMISSION',
      indicators,
      recommendedActions: this.getRecommendedActions(level),
      assessedAt: new Date(),
      assessedBy: 'spectrum-analyzer',
    };
  }

  /**
   * Check if frequency is in military allocation
   */
  private checkMilitaryBands(frequencyHz: number): string[] {
    const bands: string[] = [];

    // Common military allocations (simplified)
    if (frequencyHz >= 225e6 && frequencyHz <= 400e6) bands.push('UHF MIL');
    if (frequencyHz >= 960e6 && frequencyHz <= 1215e6) bands.push('L-BAND');
    if (frequencyHz >= 1350e6 && frequencyHz <= 1390e6) bands.push('RADAR');
    if (frequencyHz >= 2700e6 && frequencyHz <= 2900e6) bands.push('S-BAND');
    if (frequencyHz >= 5250e6 && frequencyHz <= 5850e6) bands.push('C-BAND');
    if (frequencyHz >= 8500e6 && frequencyHz <= 10500e6) bands.push('X-BAND');

    return bands;
  }

  /**
   * Get recommended actions based on threat level
   */
  private getRecommendedActions(level: ThreatAssessment['level']): string[] {
    switch (level) {
      case 'CRITICAL':
        return [
          'Immediate notification to watch officer',
          'Initiate geolocation tracking',
          'Cross-reference with MASINT tracks',
          'Request tasking for detailed analysis',
        ];
      case 'HIGH':
        return [
          'Notify intelligence analyst',
          'Correlate with existing entities',
          'Monitor for pattern changes',
        ];
      case 'MEDIUM':
        return [
          'Log for trend analysis',
          'Update signature database',
          'Schedule periodic monitoring',
        ];
      case 'LOW':
        return ['Log observation', 'Include in periodic report'];
      default:
        return ['Archive for reference'];
    }
  }

  /**
   * Default threat assessment
   */
  private defaultThreatAssessment(): ThreatAssessment {
    return {
      level: 'NONE',
      category: 'UNKNOWN',
      indicators: [],
      recommendedActions: ['Manual assessment required'],
      assessedAt: new Date(),
      assessedBy: 'spectrum-analyzer',
    };
  }

  /**
   * Generate alert for new signal detection
   */
  private generateNewSignalAlert(soi: SignalOfInterest): IntelAlert {
    const priority = this.mapThreatToPriority(soi.threatAssessment.level);

    return {
      id: uuidv4(),
      type: 'NEW_SIGNAL',
      priority,
      title: `New ${soi.waveform.modulationType} signal detected`,
      description: `Signal at ${(soi.waveform.centerFrequencyHz / 1e6).toFixed(3)} MHz with ${(soi.waveform.bandwidthHz / 1e3).toFixed(1)} kHz bandwidth`,
      source: 'SIGINT',
      relatedEntityIds: soi.correlatedEntities,
      relatedSignalIds: [soi.id],
      relatedTrackIds: [],
      odniGapReferences: soi.odniGapReferences,
      geolocation: soi.detectionLocations[0],
      timestamp: new Date(),
      acknowledged: false,
    };
  }

  /**
   * Map threat level to alert priority
   */
  private mapThreatToPriority(
    threatLevel: ThreatAssessment['level'],
  ): AlertPriority {
    const mapping: Record<ThreatAssessment['level'], AlertPriority> = {
      NONE: 'LOW',
      LOW: 'LOW',
      MEDIUM: 'MEDIUM',
      HIGH: 'HIGH',
      CRITICAL: 'FLASH',
    };
    return mapping[threatLevel];
  }

  /**
   * Compare confidence levels
   */
  private compareConfidence(a: ConfidenceLevel, b: ConfidenceLevel): number {
    const order: Record<ConfidenceLevel, number> = {
      LOW: 0,
      MEDIUM: 1,
      HIGH: 2,
      CONFIRMED: 3,
    };
    return order[a] - order[b];
  }

  /**
   * Get all active signals of interest
   */
  getActiveSignals(): SignalOfInterest[] {
    return Array.from(this.activeSignals.values());
  }

  /**
   * Get signal by ID
   */
  getSignal(id: string): SignalOfInterest | undefined {
    return this.activeSignals.get(id);
  }

  /**
   * Update signal with correlated entities
   */
  async correlateEntities(
    signalId: string,
    entityIds: string[],
  ): Promise<void> {
    const soi = this.activeSignals.get(signalId);
    if (!soi) return;

    for (const entityId of entityIds) {
      if (!soi.correlatedEntities.includes(entityId)) {
        soi.correlatedEntities.push(entityId);
      }
    }

    this.activeSignals.set(signalId, soi);
  }

  /**
   * Update signal with ODNI gap references
   */
  async addOdniGapReferences(
    signalId: string,
    gapIds: string[],
  ): Promise<void> {
    const soi = this.activeSignals.get(signalId);
    if (!soi) return;

    for (const gapId of gapIds) {
      if (!soi.odniGapReferences.includes(gapId)) {
        soi.odniGapReferences.push(gapId);
      }
    }

    this.activeSignals.set(signalId, soi);

    // Generate ODNI gap hit alert
    if (this.alertCallback && gapIds.length > 0) {
      const alert: IntelAlert = {
        id: uuidv4(),
        type: 'ODNI_GAP_HIT',
        priority: 'HIGH',
        title: `Signal matches ODNI intelligence gap`,
        description: `Signal ${signalId} correlates with gap(s): ${gapIds.join(', ')}`,
        source: 'SIGINT',
        relatedEntityIds: soi.correlatedEntities,
        relatedSignalIds: [signalId],
        relatedTrackIds: [],
        odniGapReferences: gapIds,
        geolocation: soi.detectionLocations[0],
        timestamp: new Date(),
        acknowledged: false,
      };
      await this.alertCallback(alert);
    }
  }

  /**
   * Start periodic cleanup of stale signals
   */
  private startCleanupTask(): void {
    setInterval(() => {
      const cutoff = Date.now() - this.config.soiRetentionMs;
      for (const [id, soi] of this.activeSignals) {
        if (soi.lastSeenAt.getTime() < cutoff) {
          this.activeSignals.delete(id);
          logger.debug({ message: 'Removed stale SOI', soiId: id });
        }
      }
    }, 60000); // Run every minute
  }

  /**
   * Get analyzer statistics
   */
  getStatistics(): {
    activeSignalCount: number;
    queueLength: number;
    signalsByModulation: Record<string, number>;
    signalsByThreatLevel: Record<string, number>;
  } {
    const signalsByModulation: Record<string, number> = {};
    const signalsByThreatLevel: Record<string, number> = {};

    for (const soi of this.activeSignals.values()) {
      signalsByModulation[soi.waveform.modulationType] =
        (signalsByModulation[soi.waveform.modulationType] || 0) + 1;
      signalsByThreatLevel[soi.threatAssessment.level] =
        (signalsByThreatLevel[soi.threatAssessment.level] || 0) + 1;
    }

    return {
      activeSignalCount: this.activeSignals.size,
      queueLength: this.analysisQueue.length,
      signalsByModulation,
      signalsByThreatLevel,
    };
  }
}

export default SpectrumAnalyzer;
