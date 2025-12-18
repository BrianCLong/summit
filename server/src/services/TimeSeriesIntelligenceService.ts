
import { provenanceLedger, ProvenanceEntry } from '../provenance/ledger.js';

export interface ForecastResult {
  entityId: string;
  metric: string;
  horizon: number;
  forecast: Array<{
    timestamp: Date;
    value: number;
    lowerBound: number;
    upperBound: number;
  }>;
  historical: Array<{
    timestamp: Date;
    value: number;
  }>;
  model: {
    type: string;
    params: Record<string, any>;
    confidence: number;
  };
}

export class TimeSeriesIntelligenceService {
  private static instance: TimeSeriesIntelligenceService;

  private constructor() {}

  public static getInstance(): TimeSeriesIntelligenceService {
    if (!TimeSeriesIntelligenceService.instance) {
      TimeSeriesIntelligenceService.instance = new TimeSeriesIntelligenceService();
    }
    return TimeSeriesIntelligenceService.instance;
  }

  /**
   * Forecasts the activity volume (number of ledger entries) for an entity.
   */
  async forecastActivity(
    entityId: string,
    tenantId: string,
    horizon: number = 7,
    lookbackDays: number = 90
  ): Promise<ForecastResult> {
    const entries = await this.getHistory(entityId, tenantId, lookbackDays);

    // Bucket by day
    const dailyCounts = new Map<string, number>();
    const now = new Date();
    const startDate = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

    // Initialize all days with 0
    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
      dailyCounts.set(d.toISOString().split('T')[0], 0);
    }

    // Count entries
    for (const entry of entries) {
      const dateKey = new Date(entry.timestamp).toISOString().split('T')[0];
      if (dailyCounts.has(dateKey)) {
        dailyCounts.set(dateKey, (dailyCounts.get(dateKey) || 0) + 1);
      }
    }

    const sortedDates = Array.from(dailyCounts.keys()).sort();
    const values = sortedDates.map(d => dailyCounts.get(d)!);
    const historical = sortedDates.map((d, i) => ({
      timestamp: new Date(d),
      value: values[i]
    }));

    const forecast = this.forecastHolt(values, horizon);

    // Map forecast steps to dates
    const forecastPoints = forecast.values.map((val, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() + i + 1);
      return {
        timestamp: date,
        value: Math.max(0, val), // Activity cannot be negative
        lowerBound: Math.max(0, forecast.lower[i]),
        upperBound: forecast.upper[i]
      };
    });

    return {
      entityId,
      metric: 'activity_volume',
      horizon,
      historical,
      forecast: forecastPoints,
      model: {
        type: 'Holt-Winters Double Exponential Smoothing',
        params: { alpha: 0.3, beta: 0.1 },
        confidence: 0.85 // Heuristic confidence
      }
    };
  }

  /**
   * Forecasts a specific numeric metric from the payload of ledger entries.
   * Path is dot-separated, e.g., "payload.score" or "metadata.performance".
   */
  async forecastMetric(
    entityId: string,
    tenantId: string,
    metricPath: string,
    horizon: number = 7,
    lookbackDays: number = 90
  ): Promise<ForecastResult> {
    const entries = await this.getHistory(entityId, tenantId, lookbackDays);

    // Extract values
    const dataPoints: Array<{ timestamp: Date; value: number }> = [];

    for (const entry of entries) {
      const val = this.extractValue(entry, metricPath);
      if (typeof val === 'number') {
        dataPoints.push({ timestamp: new Date(entry.timestamp), value: val });
      }
    }

    // Sort by time
    dataPoints.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // If irregular, we might need to resample. For now, we take average per day if multiple,
    // or carry forward if missing (simple imputation).
    // Simplified: aggregate by day (avg).

    const dailyValues = new Map<string, { sum: number; count: number }>();
    const now = new Date();
    const startDate = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

    for (const p of dataPoints) {
      if (p.timestamp < startDate) continue;
      const dateKey = p.timestamp.toISOString().split('T')[0];
      const curr = dailyValues.get(dateKey) || { sum: 0, count: 0 };
      curr.sum += p.value;
      curr.count++;
      dailyValues.set(dateKey, curr);
    }

    const sortedDates = [];
    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
      sortedDates.push(d.toISOString().split('T')[0]);
    }

    const values: number[] = [];
    let lastKnown = 0;

    for (const d of sortedDates) {
      const entry = dailyValues.get(d);
      if (entry) {
        lastKnown = entry.sum / entry.count;
        values.push(lastKnown);
      } else {
        values.push(lastKnown); // Carry forward
      }
    }

    const historical = sortedDates.map((d, i) => ({
      timestamp: new Date(d),
      value: values[i]
    }));

    const forecast = this.forecastHolt(values, horizon);

    const forecastPoints = forecast.values.map((val, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() + i + 1);
      return {
        timestamp: date,
        value: val,
        lowerBound: forecast.lower[i],
        upperBound: forecast.upper[i]
      };
    });

    return {
      entityId,
      metric: metricPath,
      horizon,
      historical,
      forecast: forecastPoints,
      model: {
        type: 'Holt-Winters Double Exponential Smoothing',
        params: { alpha: 0.3, beta: 0.1 },
        confidence: 0.8
      }
    };
  }

  private async getHistory(entityId: string, tenantId: string, days: number): Promise<ProvenanceEntry[]> {
    // We fetch entries specifically for this resource.
    // Since getEntries doesn't support date filtering yet (only sequence), we fetch a reasonable batch
    // and filter in memory. Since we filter by resourceId in DB, this is much more efficient.
    const entries = await provenanceLedger.getEntries(tenantId, {
      resourceId: entityId,
      limit: 1000,
      order: 'DESC'
    });

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return entries.filter(e => new Date(e.timestamp) >= since);
  }

  private extractValue(obj: any, path: string): any {
    return path.split('.').reduce((o, k) => (o || {})[k], obj);
  }

  /**
   * Holt's Linear Trend Method
   */
  private forecastHolt(data: number[], horizon: number, alpha: number = 0.3, beta: number = 0.1): { values: number[], lower: number[], upper: number[] } {
    if (data.length < 2) {
      const val = data.length > 0 ? data[0] : 0;
      return {
        values: Array(horizon).fill(val),
        lower: Array(horizon).fill(val),
        upper: Array(horizon).fill(val)
      };
    }

    let level = data[0];
    let trend = data[1] - data[0];

    // Calculate residuals for confidence intervals
    let sumSquaredResiduals = 0;

    for (let i = 1; i < data.length; i++) {
      const prevLevel = level;
      const prevTrend = trend;
      const val = data[i];

      level = alpha * val + (1 - alpha) * (prevLevel + prevTrend);
      trend = beta * (level - prevLevel) + (1 - beta) * prevTrend;

      const fitted = prevLevel + prevTrend;
      sumSquaredResiduals += Math.pow(val - fitted, 2);
    }

    const stdDev = Math.sqrt(sumSquaredResiduals / (data.length - 1)) || 1; // Avoid 0
    const forecasts: number[] = [];
    const lowers: number[] = [];
    const uppers: number[] = [];

    for (let h = 1; h <= horizon; h++) {
      const forecast = level + h * trend;
      forecasts.push(forecast);

      // Simple confidence interval expanding with time
      const interval = 1.96 * stdDev * Math.sqrt(h);
      lowers.push(forecast - interval);
      uppers.push(forecast + interval);
    }

    return { values: forecasts, lower: lowers, upper: uppers };
  }
}

export const timeSeriesIntelligence = TimeSeriesIntelligenceService.getInstance();
