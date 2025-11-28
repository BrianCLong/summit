import { SIEMEvent, AnomalyScore } from './types.js';

/**
 * Basic statistical anomaly detector.
 * Uses a simple count-based anomaly detection.
 */
export class AnomalyDetector {
  private userEventCounts: Map<string, number> = new Map();
  private ipEventCounts: Map<string, number> = new Map();
  private readonly THRESHOLD = 50; // Arbitrary threshold for "high velocity" in this session

  /**
   * Tracks an event and returns an anomaly score if high.
   */
  public trackAndScore(event: SIEMEvent): AnomalyScore | null {
    let anomaly: AnomalyScore | null = null;

    if (event.userId) {
      const count = (this.userEventCounts.get(event.userId) || 0) + 1;
      this.userEventCounts.set(event.userId, count);

      if (count > this.THRESHOLD) {
         anomaly = {
          entityId: event.userId,
          score: Math.min(count / this.THRESHOLD, 1.0),
          factors: [`High event velocity for user (${count} events)`],
          timestamp: new Date()
        };
      }
    }

    if (event.ipAddress) {
      const count = (this.ipEventCounts.get(event.ipAddress) || 0) + 1;
      this.ipEventCounts.set(event.ipAddress, count);

      if (count > this.THRESHOLD) {
         // Merge or overwrite
         const score = Math.min(count / this.THRESHOLD, 1.0);
         if (!anomaly || score > anomaly.score) {
            anomaly = {
                entityId: event.ipAddress,
                score: score,
                factors: [`High event velocity for IP (${count} events)`],
                timestamp: new Date()
             };
         }
      }
    }

    return anomaly;
  }

  public reset() {
      this.userEventCounts.clear();
      this.ipEventCounts.clear();
  }
}

export const anomalyDetector = new AnomalyDetector();
