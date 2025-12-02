/**
 * IntelGraph SIGINT/MASINT Intelligence Fusion Service
 *
 * Provides spectrum analysis, sensor fusion, signature matching,
 * and intelligence correlation capabilities for the Summit platform.
 *
 * Features:
 * - SIGINT spectrum analysis with waveform decoding
 * - MASINT multi-sensor fusion with Kalman filtering
 * - Signature matching agents
 * - Pattern recognition and anomaly detection
 * - Neo4j entity correlation for edge-denied operations
 * - Redis-cached alerting with p95 < 2s latency
 * - OSINT/CTI integration
 * - ODNI intelligence gap tracking
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

// Types
export * from './types/index.js';

// Spectrum Analysis
export { WaveformDecoder, WaveformDecoderConfig } from './spectrum/waveform-decoder.js';
export { SpectrumAnalyzer, SpectrumAnalyzerConfig } from './spectrum/spectrum-analyzer.js';

// Sensor Fusion
export { SensorFusionEngine, SensorFusionConfig } from './fusion/sensor-fusion.js';

// Agents
export { SignatureMatcher, SignatureMatcherConfig } from './agents/signature-matcher.js';
export { PatternAgent, PatternAgentConfig, DetectedPattern, PatternType } from './agents/pattern-agent.js';

// Correlation
export { Neo4jCorrelator, CorrelatorConfig } from './correlation/neo4j-correlator.js';

// Cache
export { AlertCache, AlertCacheConfig } from './cache/alert-cache.js';

// OSINT
export { OsintFusionEngine, OsintFusionConfig, OsintCorrelation } from './osint/osint-fusion.js';

// Utils
export { logger } from './utils/logger.js';

/**
 * IntelFusionService - Unified service orchestrating all intelligence components
 */
import { SpectrumAnalyzer } from './spectrum/spectrum-analyzer.js';
import { SensorFusionEngine } from './fusion/sensor-fusion.js';
import { SignatureMatcher } from './agents/signature-matcher.js';
import { PatternAgent } from './agents/pattern-agent.js';
import { Neo4jCorrelator } from './correlation/neo4j-correlator.js';
import { AlertCache } from './cache/alert-cache.js';
import { OsintFusionEngine } from './osint/osint-fusion.js';
import { IntelAlert, SignalOfInterest, FusedTrack, SpectrumSample, SensorReading } from './types/index.js';
import { logger } from './utils/logger.js';

export interface IntelFusionConfig {
  tenantId: string;
  enableNeo4j: boolean;
  enableRedis: boolean;
  enableOsint: boolean;
}

export class IntelFusionService {
  private spectrumAnalyzer: SpectrumAnalyzer;
  private sensorFusion: SensorFusionEngine;
  private signatureMatcher: SignatureMatcher;
  private patternAgent: PatternAgent;
  private correlator: Neo4jCorrelator | null = null;
  private alertCache: AlertCache | null = null;
  private osintEngine: OsintFusionEngine | null = null;
  private config: IntelFusionConfig;
  private initialized: boolean = false;

  constructor(config: Partial<IntelFusionConfig> = {}) {
    this.config = {
      tenantId: config.tenantId || 'default',
      enableNeo4j: config.enableNeo4j ?? true,
      enableRedis: config.enableRedis ?? true,
      enableOsint: config.enableOsint ?? true,
    };

    // Initialize core components
    this.spectrumAnalyzer = new SpectrumAnalyzer();
    this.sensorFusion = new SensorFusionEngine();
    this.signatureMatcher = new SignatureMatcher();
    this.patternAgent = new PatternAgent();

    // Wire up callbacks
    this.setupCallbacks();
  }

  /**
   * Initialize all services
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize Neo4j correlator
      if (this.config.enableNeo4j) {
        this.correlator = new Neo4jCorrelator();
        await this.correlator.connect();
        this.correlator.onAlert((alert) => this.handleAlert(alert));
      }

      // Initialize Redis alert cache
      if (this.config.enableRedis) {
        this.alertCache = new AlertCache();
        await this.alertCache.connect();
      }

      // Initialize OSINT engine
      if (this.config.enableOsint) {
        this.osintEngine = new OsintFusionEngine();
        this.osintEngine.onAlert((alert) => this.handleAlert(alert));
      }

      this.initialized = true;
      logger.info({ message: 'Intel fusion service initialized' });
    } catch (error) {
      logger.error({
        message: 'Failed to initialize intel fusion service',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Setup internal callbacks
   */
  private setupCallbacks(): void {
    // Spectrum analyzer alerts
    this.spectrumAnalyzer.onAlert((alert) => this.handleAlert(alert));

    // Spectrum analyzer signature matching
    this.spectrumAnalyzer.onSignatureMatch((waveform) =>
      this.signatureMatcher.matchWaveform(waveform),
    );

    // Sensor fusion alerts
    this.sensorFusion.onAlert((alert) => this.handleAlert(alert));

    // Pattern agent alerts
    this.patternAgent.onAlert((alert) => this.handleAlert(alert));
  }

  /**
   * Handle alert from any component
   */
  private async handleAlert(alert: IntelAlert): Promise<void> {
    if (this.alertCache) {
      const { latencyMs } = await this.alertCache.publishAlert(alert);
      logger.debug({
        message: 'Alert published',
        alertId: alert.id,
        type: alert.type,
        latencyMs,
      });
    }
  }

  /**
   * Process spectrum data
   */
  async processSpectrum(
    samples: SpectrumSample[],
    sampleRate: number,
  ): Promise<SignalOfInterest | null> {
    const signal = await this.spectrumAnalyzer.processSpectrum(samples, sampleRate);

    if (signal) {
      // Correlate with graph
      if (this.correlator) {
        await this.correlator.storeSignal(signal, this.config.tenantId);
        const correlations = await this.correlator.correlateSignal(
          signal,
          this.config.tenantId,
        );
        await this.spectrumAnalyzer.correlateEntities(
          signal.id,
          correlations.map((c) => c.entityId),
        );
      }

      // Pattern analysis
      await this.patternAgent.analyzeSignal(signal);

      // OSINT correlation
      if (this.osintEngine) {
        await this.osintEngine.correlateSignal(signal);
      }
    }

    return signal;
  }

  /**
   * Process sensor reading
   */
  async processSensorReading(reading: SensorReading): Promise<FusedTrack | null> {
    const track = await this.sensorFusion.processSensorReading(reading);

    if (track) {
      // Correlate with graph
      if (this.correlator) {
        await this.correlator.storeTrack(track, this.config.tenantId);
        const correlations = await this.correlator.correlateTrack(
          track,
          this.config.tenantId,
        );
        for (const corr of correlations) {
          this.sensorFusion.associateEntity(track.id, corr.entityId);
        }
      }

      // Pattern analysis
      await this.patternAgent.analyzeTrack(track);

      // OSINT correlation
      if (this.osintEngine) {
        await this.osintEngine.correlateTrack(track);
      }
    }

    return track;
  }

  /**
   * Get active signals
   */
  getActiveSignals(): SignalOfInterest[] {
    return this.spectrumAnalyzer.getActiveSignals();
  }

  /**
   * Get active tracks
   */
  getActiveTracks(): FusedTrack[] {
    return this.sensorFusion.getTracks();
  }

  /**
   * Get recent alerts
   */
  async getRecentAlerts(limit: number = 100): Promise<IntelAlert[]> {
    if (!this.alertCache) return [];
    return this.alertCache.getRecentAlerts(limit);
  }

  /**
   * Get performance metrics
   */
  getMetrics(): Record<string, unknown> {
    return {
      spectrum: this.spectrumAnalyzer.getStatistics(),
      fusion: this.sensorFusion.getStatistics(),
      signatures: this.signatureMatcher.getStatistics(),
      patterns: this.patternAgent.getPatterns().length,
      osint: this.osintEngine?.getStatistics(),
      alerts: this.alertCache?.getMetrics(),
      odniGaps: this.correlator?.getOdniGapStatus(),
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<Record<string, unknown>> {
    const health: Record<string, unknown> = {
      status: 'healthy',
      initialized: this.initialized,
    };

    if (this.correlator) {
      health.neo4j = await this.correlator.healthCheck();
    }

    if (this.alertCache) {
      health.redis = await this.alertCache.healthCheck();
    }

    return health;
  }

  /**
   * Shutdown service
   */
  async shutdown(): Promise<void> {
    if (this.correlator) {
      await this.correlator.close();
    }

    if (this.alertCache) {
      await this.alertCache.close();
    }

    this.initialized = false;
    logger.info({ message: 'Intel fusion service shutdown' });
  }
}

export default IntelFusionService;
