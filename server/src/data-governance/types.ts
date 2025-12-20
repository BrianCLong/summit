
import { z } from 'zod';

export type DataAssetType = 'table' | 'topic' | 'file' | 'model' | 'dashboard';
export type SensitivityLevel = 'public' | 'internal' | 'confidential' | 'restricted' | 'critical';

export interface DataAsset {
  id: string;
  urn: string;
  name: string;
  description?: string;
  type: DataAssetType;
  source: string; // e.g. "postgres", "kafka", "s3"
  schema: SchemaDefinition;
  owners: string[];
  tags: string[];
  sensitivity: SensitivityLevel;
  metadata: Record<string, any>;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SchemaDefinition {
  fields: SchemaField[];
}

export interface SchemaField {
  name: string;
  type: string;
  description?: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isPii: boolean;
  piiType?: string; // e.g. "email", "ssn"
  tags: string[];
}

export interface QualityRule {
  id: string;
  assetId: string;
  name: string;
  type: 'expect_column_values_to_be_not_null' | 'expect_column_values_to_be_unique' | 'expect_column_values_to_be_between' | 'expect_table_row_count_to_be_between' | 'custom_sql';
  params: Record<string, any>;
  criticality: 'low' | 'medium' | 'high';
  tenantId: string;
}

export interface QualityCheckResult {
  id: string;
  ruleId: string;
  assetId: string;
  passed: boolean;
  observedValue?: any;
  details?: string;
  executedAt: Date;
  tenantId: string;
}

export interface GovernancePolicy {
  id: string;
  name: string;
  description: string;
  rules: PolicyRule[]; // Logic to check compliance
  actions: PolicyAction[]; // Actions to take on violation (alert, block)
  tenantId: string;
}

export type PolicyRule = {
  field: string;
  operator: 'equals' | 'contains' | 'exists';
  value: any;
};

export type PolicyAction = 'alert' | 'block_access' | 'redact';
