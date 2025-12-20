/**
 * Kaplan-Meier Survival Estimator
 */

export interface SurvivalData {
  time: number;
  event: boolean; // true if event occurred, false if censored
}

export interface SurvivalEstimate {
  time: number;
  survival: number;
  nAtRisk: number;
  nEvents: number;
  confidence: [number, number];
}

export class KaplanMeierEstimator {
  private survivalFunction: SurvivalEstimate[] = [];

  /**
   * Fit the Kaplan-Meier estimator
   */
  fit(data: SurvivalData[]): void {
    // Sort by time
    const sorted = [...data].sort((a, b) => a.time - b.time);

    // Get unique event times
    const eventTimes = [...new Set(sorted.filter(d => d.event).map(d => d.time))];

    let nAtRisk = sorted.length;
    let survivalProb = 1.0;

    this.survivalFunction = [];

    for (const time of eventTimes) {
      const nEvents = sorted.filter(d => d.time === time && d.event).length;
      const nCensored = sorted.filter(d => d.time === time && !d.event).length;

      // Calculate survival probability
      survivalProb *= (nAtRisk - nEvents) / nAtRisk;

      // Greenwood's formula for confidence interval
      const variance = this.calculateVariance(eventTimes.slice(0, eventTimes.indexOf(time) + 1), sorted);
      const se = Math.sqrt(variance) * survivalProb;
      const confidence: [number, number] = [
        Math.max(0, survivalProb - 1.96 * se),
        Math.min(1, survivalProb + 1.96 * se),
      ];

      this.survivalFunction.push({
        time,
        survival: survivalProb,
        nAtRisk,
        nEvents,
        confidence,
      });

      nAtRisk -= (nEvents + nCensored);
    }
  }

  /**
   * Get survival probability at time t
   */
  survivalAt(t: number): number {
    if (this.survivalFunction.length === 0) {
      throw new Error('Model must be fitted first');
    }

    // Find the largest time <= t
    for (let i = this.survivalFunction.length - 1; i >= 0; i--) {
      if (this.survivalFunction[i].time <= t) {
        return this.survivalFunction[i].survival;
      }
    }

    return 1.0; // Before first event
  }

  /**
   * Get median survival time
   */
  getMedianSurvivalTime(): number {
    for (const estimate of this.survivalFunction) {
      if (estimate.survival <= 0.5) {
        return estimate.time;
      }
    }
    return Infinity; // Median not reached
  }

  /**
   * Get full survival function
   */
  getSurvivalFunction(): SurvivalEstimate[] {
    return this.survivalFunction;
  }

  /**
   * Calculate variance using Greenwood's formula
   */
  private calculateVariance(times: number[], data: SurvivalData[]): number {
    let variance = 0;
    let nAtRisk = data.length;

    for (const time of times) {
      const nEvents = data.filter(d => d.time === time && d.event).length;

      if (nAtRisk > 0 && nAtRisk - nEvents > 0) {
        variance += nEvents / (nAtRisk * (nAtRisk - nEvents));
      }

      const nCensored = data.filter(d => d.time === time && !d.event).length;
      nAtRisk -= (nEvents + nCensored);
    }

    return variance;
  }
}
