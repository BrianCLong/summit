import pino from 'pino';

import type { EntanglementSignature } from './models/EntanglementSignature.js';
import type { SynchronizationEvent } from './models/SynchronizationEvent.js';
import type { SystemCoupling } from './models/SystemCoupling.js';
import { createSystemCoupling } from './models/SystemCoupling.js';
import type { RiskScore } from './models/RiskScore.js';

import { LatentCouplingFinder } from './algorithms/LatentCouplingFinder.js';
import type { TimeSeriesData } from './algorithms/LatentCouplingFinder.js';
import { SynchronizationDetector } from './algorithms/SynchronizationDetector.js';
import type { SystemEvent } from './algorithms/SynchronizationDetector.js';
import { RiskScorer } from './algorithms/RiskScorer.js';
import { CrossDomainCorrelator } from './algorithms/CrossDomainCorrelator.js';
import type { DomainMetrics } from './algorithms/CrossDomainCorrelator.js';

const logger = pino({ name: 'EntanglementDetector' });

export interface DetectorConfig {
  observationWindowMs?: number;
  minCouplingStrength?: number;
  scanIntervalMs?: number;
  confidenceThreshold?: number;
}

export interface EntanglementMap {
  signatures: EntanglementSignature[];
  couplings: SystemCoupling[];
  systems: string[];
  detectedAt: Date;
  observationWindowMs: number;
  totalSignatures: number;
  totalCouplings: number;
}

/**
 * Main orchestrator for cross-system entanglement detection
 */
export class EntanglementDetector {
  private config: Required<DetectorConfig>;
  private couplingFinder: LatentCouplingFinder;
  private syncDetector: SynchronizationDetector;
  private riskScorer: RiskScorer;
  private crossDomainCorrelator: CrossDomainCorrelator;

  // In-memory stores (production would use Redis/persistent storage)
  private signatures: Map<string, EntanglementSignature> = new Map();
  private couplings: Map<string, SystemCoupling> = new Map();
  private syncEvents: SynchronizationEvent[] = [];
  private riskScores: Map<string, RiskScore> = new Map();

  constructor(config: DetectorConfig = {}) {
    this.config = {
      observationWindowMs: config.observationWindowMs ?? 300000,
      minCouplingStrength: config.minCouplingStrength ?? 0.7,
      scanIntervalMs: config.scanIntervalMs ?? 60000,
      confidenceThreshold: config.confidenceThreshold ?? 0.95,
    };

    this.couplingFinder = new LatentCouplingFinder({
      minCorrelation: this.config.minCouplingStrength,
      minConfidence: this.config.confidenceThreshold,
      observationWindow: this.config.observationWindowMs,
    });

    this.syncDetector = new SynchronizationDetector({
      syncThreshold: 0.7,
    });

    this.riskScorer = new RiskScorer();

    this.crossDomainCorrelator = new CrossDomainCorrelator({
      minCorrelation: this.config.minCouplingStrength,
    });

    logger.info({ config: this.config }, 'EntanglementDetector initialized');
  }

  /**
   * Detect entanglements across specified systems
   */
  async detectEntanglements(
    timeSeriesData: TimeSeriesData[],
    systemEvents?: SystemEvent[],
  ): Promise<EntanglementMap> {
    logger.info(
      { systemCount: timeSeriesData.length },
      'Starting entanglement detection',
    );

    const detectedAt = new Date();

    // 1. Find latent couplings
    const newSignatures = await this.couplingFinder.findCouplings(timeSeriesData);

    // Store signatures
    for (const signature of newSignatures) {
      this.signatures.set(signature.id, signature);
    }

    // 2. Create system couplings from signatures
    const newCouplings = this.createCouplingsFromSignatures(newSignatures);

    for (const coupling of newCouplings) {
      this.couplings.set(coupling.id, coupling);
    }

    // 3. Detect synchronization events if event data provided
    if (systemEvents && systemEvents.length > 0) {
      const syncEvents = await this.syncDetector.detectSynchronization(systemEvents);
      this.syncEvents.push(...syncEvents);
    }

    // 4. Calculate risk scores
    const systemIds = timeSeriesData.map((ts) => ts.systemId);
    const allCouplings = Array.from(this.couplings.values());
    const riskScores = await this.riskScorer.calculateRiskScores(
      systemIds,
      allCouplings,
    );

    for (const [systemId, riskScore] of riskScores) {
      this.riskScores.set(systemId, riskScore);
    }

    logger.info(
      {
        signaturesFound: newSignatures.length,
        couplingsCreated: newCouplings.length,
        riskScoresCalculated: riskScores.size,
      },
      'Entanglement detection complete',
    );

    return {
      signatures: newSignatures,
      couplings: newCouplings,
      systems: systemIds,
      detectedAt,
      observationWindowMs: this.config.observationWindowMs,
      totalSignatures: this.signatures.size,
      totalCouplings: this.couplings.size,
    };
  }

  /**
   * Discover cross-domain correlations
   */
  async discoverCrossDomainCorrelations(
    domainMetrics: DomainMetrics[],
  ): Promise<EntanglementSignature[]> {
    logger.info('Starting cross-domain correlation discovery');

    const signatures =
      await this.crossDomainCorrelator.discoverCorrelations(domainMetrics);

    // Store discovered signatures
    for (const signature of signatures) {
      this.signatures.set(signature.id, signature);
    }

    logger.info(
      { signaturesFound: signatures.length },
      'Cross-domain correlation discovery complete',
    );

    return signatures;
  }

  /**
   * Get entanglement map for all systems
   */
  getEntanglementMap(
    includeWeak: boolean = false,
    domainFilter?: string[],
  ): EntanglementMap {
    let signatures = Array.from(this.signatures.values());
    let couplings = Array.from(this.couplings.values());

    // Filter weak couplings if requested
    if (!includeWeak) {
      signatures = signatures.filter(
        (s) => s.couplingStrength >= this.config.minCouplingStrength,
      );
      couplings = couplings.filter(
        (c) => c.strength >= this.config.minCouplingStrength,
      );
    }

    // Apply domain filter if provided
    if (domainFilter && domainFilter.length > 0) {
      // This would require domain metadata - simplified for now
      // Production would filter based on actual domain assignments
    }

    const systems = new Set<string>();
    for (const signature of signatures) {
      signature.systems.forEach((s) => systems.add(s));
    }

    return {
      signatures,
      couplings,
      systems: Array.from(systems),
      detectedAt: new Date(),
      observationWindowMs: this.config.observationWindowMs,
      totalSignatures: signatures.length,
      totalCouplings: couplings.length,
    };
  }

  /**
   * Get couplings for a specific system
   */
  getCouplings(systemId: string, minStrength: number = 0.5): SystemCoupling[] {
    return Array.from(this.couplings.values()).filter(
      (c) =>
        (c.sourceSystem === systemId || c.targetSystem === systemId) &&
        c.strength >= minStrength,
    );
  }

  /**
   * Get risk score for a system
   */
  getRiskScore(systemId: string): RiskScore | undefined {
    return this.riskScores.get(systemId);
  }

  /**
   * Get all risk scores
   */
  getAllRiskScores(systemIds?: string[]): RiskScore[] {
    if (systemIds && systemIds.length > 0) {
      return systemIds
        .map((id) => this.riskScores.get(id))
        .filter((rs): rs is RiskScore => rs !== undefined);
    }

    return Array.from(this.riskScores.values());
  }

  /**
   * Get synchronization events
   */
  getSynchronizationEvents(
    startTime?: Date,
    endTime?: Date,
    systemIds?: string[],
    minScore: number = 0.7,
  ): SynchronizationEvent[] {
    let events = [...this.syncEvents];

    // Filter by time range
    if (startTime) {
      events = events.filter((e) => e.timestamp >= startTime);
    }
    if (endTime) {
      events = events.filter((e) => e.timestamp <= endTime);
    }

    // Filter by systems
    if (systemIds && systemIds.length > 0) {
      events = events.filter((e) =>
        e.systems.some((s) => systemIds.includes(s)),
      );
    }

    // Filter by score
    events = events.filter((e) => e.synchronizationScore >= minScore);

    return events;
  }

  /**
   * Create system couplings from entanglement signatures
   */
  private createCouplingsFromSignatures(
    signatures: EntanglementSignature[],
  ): SystemCoupling[] {
    const couplings: SystemCoupling[] = [];

    for (const signature of signatures) {
      // For each pair of systems in the signature
      for (let i = 0; i < signature.systems.length; i++) {
        for (let j = i + 1; j < signature.systems.length; j++) {
          const system1 = signature.systems[i];
          const system2 = signature.systems[j];

          const coupling = createSystemCoupling(
            system1,
            system2,
            'BIDIRECTIONAL', // Default to bidirectional
            signature.couplingStrength,
            'MUTUAL',
            'latent-coupling-finder',
            {
              failureCorrelation: signature.couplingStrength * 0.8, // Estimate
              latencyCorrelation: signature.couplingStrength * 0.7, // Estimate
              throughputCorrelation: signature.couplingStrength * 0.6, // Estimate
            },
          );

          couplings.push(coupling);
        }
      }
    }

    return couplings;
  }

  /**
   * Clear all entanglement data (for testing)
   */
  clearAll(): void {
    this.signatures.clear();
    this.couplings.clear();
    this.syncEvents = [];
    this.riskScores.clear();

    logger.info('All entanglement data cleared');
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    signatureCount: number;
    couplingCount: number;
    syncEventCount: number;
    riskScoreCount: number;
    averageCouplingStrength: number;
    highRiskSystemCount: number;
  } {
    const couplings = Array.from(this.couplings.values());
    const avgStrength =
      couplings.length > 0
        ? couplings.reduce((sum, c) => sum + c.strength, 0) / couplings.length
        : 0;

    const highRiskCount = Array.from(this.riskScores.values()).filter(
      (rs) => rs.overallRisk >= 0.7,
    ).length;

    return {
      signatureCount: this.signatures.size,
      couplingCount: this.couplings.size,
      syncEventCount: this.syncEvents.length,
      riskScoreCount: this.riskScores.size,
      averageCouplingStrength: avgStrength,
      highRiskSystemCount: highRiskCount,
    };
  }
}
