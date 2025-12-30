/**
 * Data Classification Types
 * Defines the taxonomy for data governance classification.
 */

export enum DataClassification {
  /** Publicly available data */
  PUBLIC = 'PUBLIC',
  /** Internal business data */
  INTERNAL = 'INTERNAL',
  /** Personally Identifiable Information */
  PII = 'PII',
  /** Protected Health Information */
  PHI = 'PHI',
  /** Financial data (PCI, SOX, etc.) */
  FINANCIAL = 'FINANCIAL',
  /** Secrets, keys, tokens */
  SECRET = 'SECRET',
  /** Legal or Compliance restrictions */
  RESTRICTED = 'RESTRICTED',
  /** System metadata (IDs, timestamps) */
  SYSTEM = 'SYSTEM',
}

export enum DataSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface ClassificationRule {
  id: string;
  classification: DataClassification;
  severity: DataSeverity;
  description?: string;
}

export interface ClassificationResult {
  classification: DataClassification;
  severity: DataSeverity;
  ruleId?: string;
}
