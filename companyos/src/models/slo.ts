/**
 * SLO Violation Model
 * Represents SLO violations tracked in CompanyOS
 */

export enum SLOType {
  AVAILABILITY = 'availability',
  LATENCY = 'latency',
  ERROR_RATE = 'error_rate',
  THROUGHPUT = 'throughput',
}

export enum ViolationSeverity {
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export interface SLOViolation {
  id: string;
  sloName: string;
  sloType: SLOType;
  serviceName: string;
  thresholdValue: number;
  actualValue: number;
  measurementWindow?: string;
  triggeredAt: Date;
  resolvedAt?: Date;
  severity?: ViolationSeverity;
  incidentId?: string;
  alertId?: string;
  errorBudgetImpact?: number;
  prometheusQuery?: string;
  prometheusValueJson?: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSLOViolationInput {
  sloName: string;
  sloType: SLOType;
  serviceName: string;
  thresholdValue: number;
  actualValue: number;
  measurementWindow?: string;
  severity?: ViolationSeverity;
  prometheusQuery?: string;
  prometheusValueJson?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface SLOComplianceSummary {
  sloName: string;
  serviceName: string;
  sloType: SLOType;
  violationCount: number;
  lastViolationAt?: Date;
  totalErrorBudgetConsumed?: number;
  avgActualValue?: number;
  thresholdValue?: number;
}
