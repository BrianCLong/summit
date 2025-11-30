/**
 * Integrity Shield - Core Engine
 * Detects when predictions become unreliable and triggers self-healing
 */

import { DriftDetector, DriftResult } from './algorithms/DriftDetector.js';
import { BiasAnalyzer, BiasResult } from './algorithms/BiasAnalyzer.js';
import { AdversarialDetector, AdversarialResult } from './algorithms/AdversarialDetector.js';
import { SelfHealer, HealingAction } from './algorithms/SelfHealer.js';
import { IntegrityReport, IntegrityReportFactory } from './models/IntegrityReport.js';
import { DriftMetric } from './models/DriftMetric.js';

export interface ShieldConfig {
  driftThreshold: number;
  biasThreshold: number;
  adversarialSensitivity: number;
  autoHealEnabled: boolean;
  checkIntervalMs: number;
}

export interface PredictionInput {
  id: string;
  modelId: string;
  input: unknown;
  output: unknown;
  confidence: number;
  timestamp: Date;
}

export interface ShieldStatus {
  healthy: boolean;
  driftDetected: boolean;
  biasDetected: boolean;
  adversarialDetected: boolean;
  lastCheck: Date;
  activeAlerts: number;
}

export class IntegrityShield {
  private driftDetector: DriftDetector;
  private biasAnalyzer: BiasAnalyzer;
  private adversarialDetector: AdversarialDetector;
  private selfHealer: SelfHealer;
  private config: ShieldConfig;

  private predictionHistory: PredictionInput[] = [];
  private reports: IntegrityReport[] = [];
  private status: ShieldStatus;

  constructor(config?: Partial<ShieldConfig>) {
    this.config = {
      driftThreshold: 0.15,
      biasThreshold: 0.1,
      adversarialSensitivity: 0.8,
      autoHealEnabled: true,
      checkIntervalMs: 60000,
      ...config,
    };

    this.driftDetector = new DriftDetector(this.config.driftThreshold);
    this.biasAnalyzer = new BiasAnalyzer(this.config.biasThreshold);
    this.adversarialDetector = new AdversarialDetector(this.config.adversarialSensitivity);
    this.selfHealer = new SelfHealer();

    this.status = {
      healthy: true,
      driftDetected: false,
      biasDetected: false,
      adversarialDetected: false,
      lastCheck: new Date(),
      activeAlerts: 0,
    };
  }

  async checkPrediction(prediction: PredictionInput): Promise<IntegrityReport> {
    this.predictionHistory.push(prediction);

    // Run all detectors in parallel
    const [driftResult, biasResult, adversarialResult] = await Promise.all([
      this.driftDetector.detect(prediction, this.predictionHistory),
      this.biasAnalyzer.analyze(prediction, this.predictionHistory),
      this.adversarialDetector.detect(prediction),
    ]);

    // Calculate overall reliability
    const reliabilityScore = this.calculateReliability(
      driftResult,
      biasResult,
      adversarialResult,
    );

    // Create report
    const report = IntegrityReportFactory.create({
      predictionId: prediction.id,
      modelId: prediction.modelId,
      reliabilityScore,
      driftMetrics: driftResult.metrics,
      biasIndicators: biasResult.indicators,
      adversarialSignals: adversarialResult.signals,
      timestamp: new Date(),
    });

    this.reports.push(report);
    this.updateStatus(report);

    // Trigger self-healing if needed
    if (this.config.autoHealEnabled && reliabilityScore < 0.5) {
      await this.triggerSelfHeal(report);
    }

    return report;
  }

  private calculateReliability(
    drift: DriftResult,
    bias: BiasResult,
    adversarial: AdversarialResult,
  ): number {
    const driftPenalty = drift.detected ? drift.severity * 0.4 : 0;
    const biasPenalty = bias.detected ? bias.severity * 0.3 : 0;
    const adversarialPenalty = adversarial.detected ? adversarial.confidence * 0.3 : 0;

    return Math.max(0, 1 - driftPenalty - biasPenalty - adversarialPenalty);
  }

  private updateStatus(report: IntegrityReport): void {
    this.status = {
      healthy: report.reliabilityScore >= 0.7,
      driftDetected: report.driftMetrics.some((m) => m.severity > this.config.driftThreshold),
      biasDetected: report.biasIndicators.length > 0,
      adversarialDetected: report.adversarialSignals.length > 0,
      lastCheck: new Date(),
      activeAlerts: this.countActiveAlerts(),
    };
  }

  private countActiveAlerts(): number {
    const recentReports = this.reports.filter(
      (r) => Date.now() - r.timestamp.getTime() < 3600000,
    );
    return recentReports.filter((r) => r.reliabilityScore < 0.7).length;
  }

  async triggerSelfHeal(report: IntegrityReport): Promise<HealingAction[]> {
    const actions = await this.selfHealer.heal(report);
    return actions;
  }

  getStatus(): ShieldStatus {
    return { ...this.status };
  }

  getRecentReports(count: number = 10): IntegrityReport[] {
    return this.reports.slice(-count);
  }

  getReliabilityTrend(windowSize: number = 100): number[] {
    return this.reports
      .slice(-windowSize)
      .map((r) => r.reliabilityScore);
  }

  async runFullCheck(): Promise<IntegrityReport> {
    // Comprehensive check across all recent predictions
    const recentPredictions = this.predictionHistory.slice(-100);

    const aggregatedDrift = await this.driftDetector.detectAggregate(recentPredictions);
    const aggregatedBias = await this.biasAnalyzer.analyzeAggregate(recentPredictions);

    const report = IntegrityReportFactory.create({
      predictionId: 'aggregate',
      modelId: 'all',
      reliabilityScore: this.calculateReliability(
        aggregatedDrift,
        aggregatedBias,
        { detected: false, confidence: 0, signals: [] },
      ),
      driftMetrics: aggregatedDrift.metrics,
      biasIndicators: aggregatedBias.indicators,
      adversarialSignals: [],
      timestamp: new Date(),
    });

    this.reports.push(report);
    return report;
  }

  clearHistory(): void {
    this.predictionHistory = [];
    this.reports = [];
  }
}

export function createIntegrityShield(config?: Partial<ShieldConfig>): IntegrityShield {
  return new IntegrityShield(config);
}
