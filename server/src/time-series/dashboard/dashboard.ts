import { Anomaly, ForecastPoint, TimeSeriesRow } from '../types.js';

export type DashboardPanel = {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'area';
  series: Array<{ label: string; points: Array<{ x: Date; y: number }> }>;
  annotations?: Array<{ x: Date; label: string }>;
};

export type DashboardSpec = {
  name: string;
  description?: string;
  panels: DashboardPanel[];
};

export function buildDashboard(
  name: string,
  observed: TimeSeriesRow[],
  anomalies: Anomaly[],
  forecast: ForecastPoint[],
  description?: string,
): DashboardSpec {
  const observedPanel: DashboardPanel = {
    id: 'observed',
    title: 'Observed Signals',
    type: 'line',
    series: normalizeRows(observed),
    annotations: anomalies.map((item) => ({ x: item.timestamp, label: `z=${item.zScore.toFixed(2)}` })),
  };

  const forecastPanel: DashboardPanel = {
    id: 'forecast',
    title: 'Forecast Horizon',
    type: 'area',
    series: [
      {
        label: 'predicted',
        points: forecast.map((point) => ({ x: point.timestamp, y: point.predicted })),
      },
      {
        label: 'lower',
        points: forecast.map((point) => ({ x: point.timestamp, y: point.lower })),
      },
      {
        label: 'upper',
        points: forecast.map((point) => ({ x: point.timestamp, y: point.upper })),
      },
    ],
  };

  return {
    name,
    description,
    panels: [observedPanel, forecastPanel],
  };
}

function normalizeRows(rows: TimeSeriesRow[]) {
  const fields = new Set<string>();
  rows.forEach((row) => Object.keys(row.values).forEach((field) => fields.add(field)));
  return Array.from(fields).map((field) => ({
    label: field,
    points: rows.map((row) => ({ x: row.timestamp, y: row.values[field] ?? 0 })),
  }));
}
