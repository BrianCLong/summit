/**
 * Types for Model Monitoring
 */

import { z } from 'zod';

// Drift Detection
export const DriftReportSchema = z.object({
  id: z.string().uuid(),
  model_id: z.string().uuid(),
  model_version: z.string(),
  drift_type: z.enum(['input', 'output', 'concept']),
  drift_score: z.number().min(0).max(1),
  drift_detected: z.boolean(),
  threshold: z.number(),
  baseline_start: z.string().datetime(),
  baseline_end: z.string().datetime(),
  current_start: z.string().datetime(),
  current_end: z.string().datetime(),
  feature_drifts: z.record(z.string(), z.number()).optional(),
  statistical_test: z.string(),
  p_value: z.number().optional(),
  created_at: z.string().datetime(),
});

export type DriftReport = z.infer<typeof DriftReportSchema>;

// Data Quality
export const DataQualityReportSchema = z.object({
  id: z.string().uuid(),
  model_id: z.string().uuid(),
  model_version: z.string(),
  timestamp: z.string().datetime(),
  total_records: z.number(),
  null_count: z.number(),
  null_rate: z.number(),
  outlier_count: z.number(),
  outlier_rate: z.number(),
  anomaly_count: z.number(),
  anomaly_rate: z.number(),
  schema_violations: z.number(),
  quality_score: z.number().min(0).max(1),
  issues: z.array(z.object({
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    type: z.string(),
    description: z.string(),
    count: z.number(),
  })).default([]),
});

export type DataQualityReport = z.infer<typeof DataQualityReportSchema>;

// Performance Degradation
export const PerformanceReportSchema = z.object({
  id: z.string().uuid(),
  model_id: z.string().uuid(),
  model_version: z.string(),
  timestamp: z.string().datetime(),
  metric_name: z.string(),
  current_value: z.number(),
  baseline_value: z.number(),
  degradation_percent: z.number(),
  threshold_percent: z.number(),
  degradation_detected: z.boolean(),
  sample_size: z.number(),
});

export type PerformanceReport = z.infer<typeof PerformanceReportSchema>;

// Alert
export const AlertSchema = z.object({
  id: z.string().uuid(),
  model_id: z.string().uuid(),
  model_version: z.string(),
  alert_type: z.enum(['drift', 'data_quality', 'performance', 'latency', 'error_rate']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  title: z.string(),
  description: z.string(),
  details: z.record(z.string(), z.any()),
  status: z.enum(['open', 'acknowledged', 'resolved']),
  created_at: z.string().datetime(),
  acknowledged_at: z.string().datetime().optional(),
  resolved_at: z.string().datetime().optional(),
  acknowledged_by: z.string().optional(),
  resolved_by: z.string().optional(),
});

export type Alert = z.infer<typeof AlertSchema>;

// Monitoring Configuration
export interface MonitoringConfig {
  model_id: string;
  model_version: string;
  drift_detection: {
    enabled: boolean;
    threshold: number;
    check_interval_minutes: number;
    baseline_window_days: number;
  };
  data_quality: {
    enabled: boolean;
    null_threshold: number;
    outlier_threshold: number;
    check_interval_minutes: number;
  };
  performance: {
    enabled: boolean;
    metrics: string[];
    degradation_threshold_percent: number;
    check_interval_minutes: number;
  };
  alerts: {
    enabled: boolean;
    channels: Array<'email' | 'slack' | 'pagerduty' | 'webhook'>;
    recipients: string[];
  };
}
