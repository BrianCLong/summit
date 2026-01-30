import {
  AnomalyType,
  DetectionContext,
  Detector,
  AnomalyResult,
  Severity,
} from '../types.js';

interface BehavioralData {
  sequence: string[];
  expectedPattern?: string[]; // Regex or list of expected next states
  userProfile?: {
    usualLocations?: string[];
    usualTimes?: string[];
  };
}

export class BehavioralDetector implements Detector {
  type = AnomalyType.BEHAVIORAL;

  async detect(context: DetectionContext): Promise<AnomalyResult> {
    const data = context.data as BehavioralData;
    const { sequence, expectedPattern } = data;

    if (!sequence || sequence.length < 2) {
      return this.createResult(context, false, 0, Severity.LOW);
    }

    // Simple sequence analysis: transition probability
    // For MVP, we can just check if the sequence contains forbidden patterns or deviates from expected

    // Example: Check for rapid state changes (A -> B -> A -> B) which might indicate flapping
    const flapping = this.detectFlapping(sequence);
    if (flapping) {
      return this.createResult(context, true, 0.8, Severity.MEDIUM, {
        description: 'Behavioral anomaly: Rapid state flapping detected',
        contributingFactors: [{ factor: 'flapping_sequence', weight: 0.8, value: sequence.slice(-5).join('->') }]
      });
    }

    // If expected pattern is provided (simplified as exact match of last N for now)
    if (expectedPattern && expectedPattern.length > 0) {
      const lastN = sequence.slice(-expectedPattern.length);
      const match = lastN.every((val, idx) => val === expectedPattern[idx]);
      if (!match) {
         // This is a weak check, just illustrative
      }
    }

    return this.createResult(context, false, 0, Severity.LOW);
  }

  private detectFlapping(sequence: string[]): boolean {
    if (sequence.length < 4) return false;
    const last4 = sequence.slice(-4);
    // A B A B pattern
    return last4[0] === last4[2] && last4[1] === last4[3] && last4[0] !== last4[1];
  }

  private createResult(
    context: DetectionContext,
    isAnomaly: boolean,
    score: number,
    severity: Severity,
    explanation?: any
  ): AnomalyResult {
    return {
      isAnomaly,
      score,
      severity,
      type: this.type,
      entityId: context.entityId,
      timestamp: context.timestamp,
      explanation,
    };
  }
}
