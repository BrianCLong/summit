import {
  AnomalyType,
  DetectionContext,
  Detector,
  AnomalyResult,
  Feedback,
} from '../anomaly/types.js';
import { TemporalDetector } from '../anomaly/detectors/temporal.js';
import { SpatialDetector } from '../anomaly/detectors/spatial.js';
import { NetworkDetector } from '../anomaly/detectors/network.js';
import { BehavioralDetector } from '../anomaly/detectors/behavioral.js';
import { alertingService } from '../lib/telemetry/alerting-service.js';

export class SummitAnomalyService {
  private static instance: SummitAnomalyService;
  private detectors: Map<AnomalyType, Detector> = new Map();
  private whitelist: Set<string> = new Set(); // Stores IDs of known false positives

  private constructor() {
    this.registerDetector(new TemporalDetector());
    this.registerDetector(new SpatialDetector());
    this.registerDetector(new NetworkDetector());
    this.registerDetector(new BehavioralDetector());
  }

  public static getInstance(): SummitAnomalyService {
    if (!SummitAnomalyService.instance) {
      SummitAnomalyService.instance = new SummitAnomalyService();
    }
    return SummitAnomalyService.instance;
  }

  public registerDetector(detector: Detector) {
    this.detectors.set(detector.type, detector);
  }

  public async analyze(context: DetectionContext): Promise<AnomalyResult | null> {
    const detector = this.detectors.get(context.type);
    if (!detector) {
      console.warn(`No detector registered for type: ${context.type}`);
      return null;
    }

    try {
      const result = await detector.detect(context);

      // Check whitelist (False Positive Reduction)
      const anomalyId = this.generateAnomalyId(context);
      if (this.whitelist.has(anomalyId)) {
        return { ...result, isAnomaly: false, score: 0, explanation: { description: 'Suppressed by whitelist', contributingFactors: [] } };
      }

      if (result.isAnomaly) {
        // Automated Alerting
        this.triggerAlert(result);
      }

      return result;
    } catch (error: any) {
      console.error('Error during anomaly detection:', error);
      return null;
    }
  }

  public reportFeedback(feedback: Feedback) {
    if (feedback.isFalsePositive) {
      this.whitelist.add(feedback.anomalyId);
      console.log(`[AnomalyService] Whitelisted anomaly ${feedback.anomalyId}`);
    } else {
      // Logic to reinforce model could go here
      console.log(`[AnomalyService] Confirmed anomaly ${feedback.anomalyId}`);
    }
  }

  private triggerAlert(result: AnomalyResult) {
    // Integrate with existing alerting service
    const message = `[${result.severity.toUpperCase()}] ${result.type} Anomaly detected for ${result.entityId}`;
    alertingService.sendAlert(message, {
      explanation: result.explanation,
      score: result.score,
      timestamp: result.timestamp
    });
  }

  private generateAnomalyId(context: DetectionContext): string {
    // Simple hash for demo purposes. In production, use a proper hash.
    // We bind it to entity and type, but maybe not timestamp if we want to suppress persistent issues?
    // If we want to suppress *this specific instance*, we include timestamp.
    // If we want to suppress "this type of behavior for this entity", we exclude timestamp.
    // Let's assume we want to suppress specific instances for now, or maybe short-term suppression.
    return `${context.type}:${context.entityId}`;
  }

  // Helper for testing
  public _resetForTesting() {
      this.whitelist.clear();
  }
}

export const summitAnomalyService = SummitAnomalyService.getInstance();
