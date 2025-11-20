/**
 * Real-time Analytics Types
 */

import type { Event } from '@intelgraph/event-processing';
import type { WindowConfig } from '@intelgraph/event-processing';

export interface AnalyticsQuery {
  id: string;
  name: string;
  eventTypes: string[];
  window?: WindowConfig;
  metrics: Metric[];
  groupBy?: string[];
  filters?: EventFilter[];
}

export interface Metric {
  name: string;
  field: string;
  function: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'stddev' | 'variance' | 'percentile' | 'rate';
  percentile?: number;
}

export interface EventFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
  value: any;
}

export interface AnalyticsResult {
  queryId: string;
  timestamp: number;
  window?: {
    start: number;
    end: number;
  };
  groups: AnalyticsGroup[];
}

export interface AnalyticsGroup {
  keys: Record<string, any>;
  metrics: Record<string, number>;
  count: number;
}

export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
  metadata?: Record<string, any>;
}

export interface TimeSeriesAnalysis {
  trend: 'increasing' | 'decreasing' | 'stable';
  seasonality: boolean;
  outliers: TimeSeriesPoint[];
  forecast?: TimeSeriesPoint[];
}

export interface AnomalyDetectionConfig {
  method: 'zscore' | 'iqr' | 'isolation-forest' | 'moving-average';
  sensitivity: number;
  windowSize?: number;
  threshold?: number;
}

export interface Anomaly {
  timestamp: number;
  value: number;
  expected: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  event?: Event;
}

export interface MLModel {
  id: string;
  name: string;
  type: 'classification' | 'regression' | 'clustering' | 'anomaly-detection';
  inputFeatures: string[];
  outputField: string;
}

export interface Prediction {
  timestamp: number;
  predicted: any;
  confidence: number;
  features: Record<string, any>;
}
