import { detectAnomalySeries, ewma } from '../../anomaly.js';
import { Anomaly, TimeSeriesRow } from '../types.js';

export function zScoreAnomalies(rows: TimeSeriesRow[], field: string, window = 30, threshold = 3.5): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const values: number[] = [];

  for (const row of rows) {
    const value = row.values[field];
    if (typeof value !== 'number') continue;
    if (values.length >= window) {
      const { anomaly, z } = detectAnomalySeries(values.slice(-window), value);
      if (anomaly && Math.abs(z) >= threshold) {
        anomalies.push({ timestamp: row.timestamp, value, zScore: z });
      }
    }
    values.push(value);
  }

  return anomalies;
}

export function seasonalEwmaAnomalies(
  rows: TimeSeriesRow[],
  field: string,
  seasonality: number,
  alpha = 0.3,
  threshold = 3.0,
): Anomaly[] {
  if (!rows.length || seasonality <= 1) return [];
  const smoothed: number[] = [];
  const anomalies: Anomaly[] = [];

  for (let i = 0; i < rows.length; i += 1) {
    const value = rows[i].values[field];
    if (typeof value !== 'number') continue;
    if (i < seasonality) {
      smoothed.push(value);
      continue;
    }
    const seasonalBaseline = smoothed[i - seasonality];
    const level = ewma(seasonalBaseline, value, alpha);
    const deviation = Math.abs(value - level);
    const normalized = seasonalBaseline === 0 ? 0 : deviation / Math.max(1, Math.abs(seasonalBaseline));
    if (normalized >= threshold) {
      anomalies.push({ timestamp: rows[i].timestamp, value, zScore: normalized });
    }
    smoothed.push(level);
  }

  return anomalies;
}
