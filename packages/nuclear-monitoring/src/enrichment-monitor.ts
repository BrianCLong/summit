/**
 * Enrichment Facility Monitoring
 *
 * Monitors uranium enrichment activities, centrifuge operations,
 * and Separative Work Unit (SWU) capacity assessment.
 */

import type {
  EnrichmentActivity,
  EnrichmentIndicator,
  ConfidenceLevel
} from './types.js';

export class EnrichmentMonitor {
  private activities: Map<string, EnrichmentActivity[]>;
  private readonly WEAPONS_GRADE_THRESHOLD = 90.0; // % U-235
  private readonly HEU_THRESHOLD = 20.0; // Highly Enriched Uranium threshold

  constructor() {
    this.activities = new Map();
  }

  /**
   * Record enrichment activity
   */
  recordActivity(activity: EnrichmentActivity): void {
    const existing = this.activities.get(activity.facility_id) || [];
    existing.push(activity);
    this.activities.set(activity.facility_id, existing);

    // Analyze for concerning indicators
    this.analyzeActivity(activity);
  }

  /**
   * Analyze enrichment activity for proliferation concerns
   */
  private analyzeActivity(activity: EnrichmentActivity): void {
    if (activity.enrichment_level >= this.WEAPONS_GRADE_THRESHOLD) {
      console.warn(`CRITICAL: Weapons-grade enrichment detected at ${activity.facility_id}`);
    } else if (activity.enrichment_level >= this.HEU_THRESHOLD) {
      console.warn(`WARNING: HEU production detected at ${activity.facility_id}`);
    }

    if (activity.centrifuge_count && activity.centrifuge_count > 5000) {
      console.warn(`High centrifuge count detected: ${activity.centrifuge_count}`);
    }
  }

  /**
   * Get enrichment activities for a facility
   */
  getActivities(facilityId: string): EnrichmentActivity[] {
    return this.activities.get(facilityId) || [];
  }

  /**
   * Calculate total SWU capacity
   */
  calculateTotalSWU(facilityId: string): number {
    const activities = this.getActivities(facilityId);
    if (activities.length === 0) return 0;

    // Use most recent activity with SWU data
    const withSWU = activities
      .filter(a => a.swu_capacity)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return withSWU[0]?.swu_capacity || 0;
  }

  /**
   * Estimate time to produce significant quantity (SQ) of HEU
   */
  estimateTimeToSQ(facilityId: string, targetEnrichment: number = 90): {
    days: number;
    swu_required: number;
    feasible: boolean;
  } {
    const SQ_HEU = 25; // kg of HEU (U-235 > 20%)
    const activities = this.getActivities(facilityId);

    if (activities.length === 0) {
      return { days: Infinity, swu_required: Infinity, feasible: false };
    }

    const latest = activities[activities.length - 1];
    const swuCapacity = latest.swu_capacity || 0;

    if (swuCapacity === 0) {
      return { days: Infinity, swu_required: Infinity, feasible: false };
    }

    // Simplified SWU calculation for weapons-grade uranium
    // Assumes feed assay 0.711% and tails assay 0.3%
    const swuPerKg = this.calculateSWUperKg(0.00711, targetEnrichment / 100, 0.003);
    const totalSWU = swuPerKg * SQ_HEU;
    const daysRequired = (totalSWU / swuCapacity) * 365;

    return {
      days: Math.ceil(daysRequired),
      swu_required: totalSWU,
      feasible: daysRequired < 365 // Feasible if less than a year
    };
  }

  /**
   * Calculate SWU per kg (simplified formula)
   */
  private calculateSWUperKg(feed: number, product: number, tails: number): number {
    const V = (p: number) => (2 * p - 1) * Math.log(p / (1 - p));
    return V(product) + (feed - product) / (feed - tails) * V(tails) -
           feed / (feed - tails) * V(feed);
  }

  /**
   * Detect unusual enrichment patterns
   */
  detectAnomalies(facilityId: string): EnrichmentIndicator[] {
    const activities = this.getActivities(facilityId);
    const anomalies: EnrichmentIndicator[] = [];

    if (activities.length < 2) return anomalies;

    // Check for rapid enrichment level increase
    const sorted = activities.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];

      const levelIncrease = curr.enrichment_level - prev.enrichment_level;
      if (levelIncrease > 10) {
        anomalies.push({
          type: 'rapid_enrichment_increase',
          value: levelIncrease,
          unit: '% U-235',
          significance: 'high',
          description: `Enrichment level increased by ${levelIncrease.toFixed(2)}% in short period`
        });
      }

      // Check for capacity expansion
      if (curr.centrifuge_count && prev.centrifuge_count) {
        const increase = curr.centrifuge_count - prev.centrifuge_count;
        if (increase > 1000) {
          anomalies.push({
            type: 'capacity_expansion',
            value: increase,
            unit: 'centrifuges',
            significance: 'high',
            description: `Added ${increase} centrifuges`
          });
        }
      }

      // Check for excessive power consumption (indicator of covert enrichment)
      if (curr.power_consumption && prev.power_consumption) {
        const powerIncrease = curr.power_consumption - prev.power_consumption;
        const percentIncrease = (powerIncrease / prev.power_consumption) * 100;
        if (percentIncrease > 50) {
          anomalies.push({
            type: 'power_surge',
            value: percentIncrease,
            unit: '%',
            significance: 'medium',
            description: `Power consumption increased by ${percentIncrease.toFixed(1)}%`
          });
        }
      }
    }

    return anomalies;
  }

  /**
   * Assess proliferation risk based on enrichment activities
   */
  assessProliferationRisk(facilityId: string): {
    risk_level: 'critical' | 'high' | 'medium' | 'low';
    risk_score: number;
    factors: string[];
  } {
    const activities = this.getActivities(facilityId);
    if (activities.length === 0) {
      return { risk_level: 'low', risk_score: 0, factors: ['No activity data'] };
    }

    const latest = activities[activities.length - 1];
    let riskScore = 0;
    const factors: string[] = [];

    // Enrichment level risk
    if (latest.enrichment_level >= this.WEAPONS_GRADE_THRESHOLD) {
      riskScore += 50;
      factors.push('Weapons-grade enrichment detected');
    } else if (latest.enrichment_level >= this.HEU_THRESHOLD) {
      riskScore += 30;
      factors.push('HEU production capability');
    }

    // Capacity risk
    if (latest.swu_capacity && latest.swu_capacity > 10000) {
      riskScore += 20;
      factors.push('High SWU capacity');
    }

    if (latest.centrifuge_count && latest.centrifuge_count > 5000) {
      riskScore += 15;
      factors.push('Large centrifuge cascade');
    }

    // Anomaly detection
    const anomalies = this.detectAnomalies(facilityId);
    if (anomalies.length > 0) {
      riskScore += anomalies.length * 5;
      factors.push(`${anomalies.length} anomalous patterns detected`);
    }

    // Determine risk level
    let risk_level: 'critical' | 'high' | 'medium' | 'low';
    if (riskScore >= 70) {
      risk_level = 'critical';
    } else if (riskScore >= 50) {
      risk_level = 'high';
    } else if (riskScore >= 30) {
      risk_level = 'medium';
    } else {
      risk_level = 'low';
    }

    return { risk_level, risk_score: riskScore, factors };
  }

  /**
   * Get enrichment trend over time
   */
  getEnrichmentTrend(facilityId: string): {
    trend: 'increasing' | 'stable' | 'decreasing' | 'unknown';
    data_points: Array<{ timestamp: string; enrichment_level: number }>;
  } {
    const activities = this.getActivities(facilityId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (activities.length < 2) {
      return { trend: 'unknown', data_points: [] };
    }

    const data_points = activities.map(a => ({
      timestamp: a.timestamp,
      enrichment_level: a.enrichment_level
    }));

    // Simple trend analysis
    const first = activities[0].enrichment_level;
    const last = activities[activities.length - 1].enrichment_level;
    const diff = last - first;

    let trend: 'increasing' | 'stable' | 'decreasing';
    if (diff > 5) {
      trend = 'increasing';
    } else if (diff < -5) {
      trend = 'decreasing';
    } else {
      trend = 'stable';
    }

    return { trend, data_points };
  }

  /**
   * Calculate material balance for enrichment process
   */
  calculateMaterialBalance(
    feedRate: number, // kg/year
    feedAssay: number, // % U-235
    productAssay: number, // % U-235
    tailsAssay: number // % U-235
  ): {
    product_rate: number;
    tails_rate: number;
    swu_required: number;
  } {
    // Material balance equations
    const P = feedRate * (feedAssay - tailsAssay) / (productAssay - tailsAssay);
    const T = feedRate - P;

    const V = (p: number) => (2 * p - 1) * Math.log(p / (1 - p));
    const swu = P * V(productAssay / 100) + T * V(tailsAssay / 100) -
                feedRate * V(feedAssay / 100);

    return {
      product_rate: P,
      tails_rate: T,
      swu_required: swu
    };
  }
}
