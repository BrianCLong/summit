/**
 * WMD Stockpile Estimation
 */

import type { StockpileEstimate, ConfidenceLevel } from './types.js';

export class StockpileEstimator {
  private estimates: Map<string, StockpileEstimate[]>;

  constructor() {
    this.estimates = new Map();
  }

  recordEstimate(estimate: StockpileEstimate): void {
    const key = `${estimate.country}-${estimate.weapon_type}`;
    const existing = this.estimates.get(key) || [];
    existing.push(estimate);
    this.estimates.set(key, existing);
  }

  getLatestEstimate(country: string, weaponType: string): StockpileEstimate | undefined {
    const key = `${country}-${weaponType}`;
    const estimates = this.estimates.get(key);
    if (!estimates || estimates.length === 0) return undefined;

    return estimates.sort((a, b) =>
      new Date(b.estimate_date).getTime() - new Date(a.estimate_date).getTime()
    )[0];
  }

  compareStockpiles(country1: string, country2: string, weaponType: string): {
    country1_total?: number;
    country2_total?: number;
    larger: string;
    ratio?: number;
  } {
    const est1 = this.getLatestEstimate(country1, weaponType);
    const est2 = this.getLatestEstimate(country2, weaponType);

    if (!est1 || !est2) {
      return { larger: 'unknown' };
    }

    const total1 = est1.total_weapons || 0;
    const total2 = est2.total_weapons || 0;

    return {
      country1_total: total1,
      country2_total: total2,
      larger: total1 > total2 ? country1 : country2,
      ratio: total2 > 0 ? total1 / total2 : undefined
    };
  }

  trackStockpileTrend(country: string, weaponType: string): {
    trend: 'increasing' | 'stable' | 'decreasing' | 'unknown';
    change_percentage?: number;
  } {
    const key = `${country}-${weaponType}`;
    const estimates = this.estimates.get(key);

    if (!estimates || estimates.length < 2) {
      return { trend: 'unknown' };
    }

    const sorted = estimates.sort((a, b) =>
      new Date(a.estimate_date).getTime() - new Date(b.estimate_date).getTime()
    );

    const first = sorted[0].total_weapons || 0;
    const last = sorted[sorted.length - 1].total_weapons || 0;
    const change = ((last - first) / first) * 100;

    let trend: 'increasing' | 'stable' | 'decreasing';
    if (change > 5) {
      trend = 'increasing';
    } else if (change < -5) {
      trend = 'decreasing';
    } else {
      trend = 'stable';
    }

    return { trend, change_percentage: change };
  }
}
