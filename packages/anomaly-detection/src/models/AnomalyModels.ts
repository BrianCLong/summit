/**
 * IntelGraph Anomaly Detection Models
 * Data models for anomaly detection and alerting
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

export interface Anomaly {
  timestamp: Date;
  value: number;
  expected_value?: number;
  anomaly_score: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'point' | 'contextual' | 'collective';
  detector: string;
  explanation?: string;
  metadata?: Record<string, any>;
}

export interface AnomalyDetectionConfig {
  method: 'statistical' | 'isolation_forest' | 'autoencoder' | 'seasonal' | 'ensemble';
  sensitivity?: number; // 0-1, higher = more sensitive
  window_size?: number;
  threshold?: number;
  seasonal_period?: number;
  hyperparameters?: Record<string, any>;
}

export interface StatisticalAnomalyConfig {
  method: 'zscore' | 'iqr' | 'mad' | 'grubbs';
  threshold?: number; // Standard deviations or multiplier
  window_size?: number; // For rolling statistics
  min_samples?: number;
}

export interface IsolationForestConfig {
  n_trees?: number;
  sample_size?: number;
  contamination?: number; // Expected proportion of anomalies
  max_features?: number;
}

export interface SeasonalAnomalyConfig {
  period: number;
  decomposition_method?: 'additive' | 'multiplicative';
  residual_threshold?: number;
  trend_threshold?: number;
}

export interface AnomalyAlert {
  alert_id: string;
  anomaly: Anomaly;
  triggered_at: Date;
  status: 'active' | 'acknowledged' | 'resolved' | 'false_positive';
  assigned_to?: string;
  notes?: string[];
  related_anomalies?: string[];
}

export interface AnomalyPattern {
  pattern_id: string;
  pattern_type: 'spike' | 'drop' | 'plateau' | 'oscillation' | 'trend_change';
  start_time: Date;
  end_time: Date;
  affected_metrics: string[];
  frequency: number;
  confidence: number;
}

export interface ChangePoint {
  timestamp: Date;
  index: number;
  confidence: number;
  change_magnitude: number;
  change_type: 'mean' | 'variance' | 'trend';
  before_stats: TimeSeriesStats;
  after_stats: TimeSeriesStats;
}

export interface TimeSeriesStats {
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
  trend?: number;
}

export interface AnomalyExplanation {
  anomaly: Anomaly;
  contributing_factors: ContributingFactor[];
  similar_historical_anomalies?: Anomaly[];
  recommended_actions?: string[];
  root_cause_analysis?: string;
}

export interface ContributingFactor {
  factor: string;
  contribution: number; // 0-1
  description: string;
}

export interface AnomalyDetectionResult {
  series_id: string;
  detector: string;
  time_range: { start: Date; end: Date };
  anomalies: Anomaly[];
  total_points: number;
  anomaly_rate: number;
  detection_time_ms: number;
  model_version?: string;
}
