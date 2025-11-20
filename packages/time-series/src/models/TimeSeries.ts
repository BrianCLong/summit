/**
 * IntelGraph Time Series Data Models
 * Enterprise-grade time series data structures for intelligence operations
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
  tags?: string[];
  quality?: number; // Data quality score 0-1
}

export interface TimeSeries {
  id: string;
  name: string;
  description?: string;
  unit?: string;
  points: TimeSeriesPoint[];
  interval?: string; // e.g., '1m', '5m', '1h', '1d'
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count' | 'first' | 'last';
  metadata?: Record<string, any>;
  retention?: string; // e.g., '30d', '1y', 'infinite'
  created_at: Date;
  updated_at: Date;
}

export interface TimeSeriesMetric {
  metric_name: string;
  entity_id?: string;
  entity_type?: string;
  timestamp: Date;
  value: number;
  unit?: string;
  tags?: Record<string, string>;
  labels?: Record<string, string>;
  dimensions?: Record<string, any>;
}

export interface HypertableConfig {
  table_name: string;
  time_column: string;
  chunk_time_interval: string; // e.g., '7 days'
  compression_enabled: boolean;
  compression_after?: string; // e.g., '7 days'
  retention_policy?: string; // e.g., '90 days'
  partitioning_column?: string;
  indexes?: string[];
}

export interface ContinuousAggregateConfig {
  view_name: string;
  source_table: string;
  time_bucket: string; // e.g., '1 hour'
  refresh_interval?: string; // e.g., '1 hour'
  refresh_lag?: string; // e.g., '1 hour'
  materialized: boolean;
}

export interface TimeSeriesQuery {
  metric_name?: string;
  entity_id?: string;
  entity_type?: string;
  start_time: Date;
  end_time: Date;
  interval?: string;
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count' | 'stddev';
  tags?: Record<string, string>;
  limit?: number;
  offset?: number;
}

export interface DownsamplingConfig {
  source_interval: string;
  target_interval: string;
  aggregation_method: 'avg' | 'sum' | 'min' | 'max' | 'first' | 'last';
  retention?: string;
}

export interface CompressionStats {
  table_name: string;
  uncompressed_bytes: number;
  compressed_bytes: number;
  compression_ratio: number;
  chunks_compressed: number;
  chunks_total: number;
  last_compression: Date;
}

export interface RetentionPolicy {
  policy_name: string;
  table_name: string;
  drop_after: string; // e.g., '90 days'
  schedule_interval?: string;
  if_not_exists?: boolean;
}

export interface TimeRangeStats {
  start_time: Date;
  end_time: Date;
  count: number;
  min_value?: number;
  max_value?: number;
  avg_value?: number;
  sum_value?: number;
  stddev_value?: number;
  missing_points?: number;
  outliers?: number;
}
