import { LifecyclePolicy, TableMapping } from './types.js';

export const LIFECYCLE_POLICIES: Record<string, LifecyclePolicy> = {
  OPERATIONAL_METADATA: {
    category: 'OPERATIONAL_METADATA',
    retention: '30d',
    deletionMode: 'hard',
    legalHoldEligible: false,
    description: 'System logs, metrics, traces, and temporary session data.',
  },
  ANALYTICS_ARTIFACTS: {
    category: 'ANALYTICS_ARTIFACTS',
    retention: '90d',
    deletionMode: 'hard',
    legalHoldEligible: true,
    description: 'Intermediate results of analytics jobs and search history.',
  },
  PREDICTIVE_MODELS: {
    category: 'PREDICTIVE_MODELS',
    retention: '1y',
    deletionMode: 'hard',
    legalHoldEligible: true,
    description: 'Risk scores, signals, and generated model artifacts.',
  },
  AUDIT_RECORDS: {
    category: 'AUDIT_RECORDS',
    retention: '7y',
    deletionMode: 'crypto-shred', // Immutable, but key deletion effectively destroys it
    legalHoldEligible: true,
    description: 'Compliance logs, access logs, and provenance records.',
  },
  TENANT_DATA: {
    category: 'TENANT_DATA',
    retention: 'infinity', // Until tenant deletion
    deletionMode: 'crypto-shred',
    legalHoldEligible: true,
    description: 'Core tenant business data (users, cases, investigations).',
  },
};

export const TABLE_MAPPINGS: TableMapping[] = [
  // Operational Metadata
  { category: 'OPERATIONAL_METADATA', tableName: 'audit_access_logs', schema: 'maestro', timestampColumn: 'accessed_at', tenantColumn: 'tenant_id' },
  { category: 'OPERATIONAL_METADATA', tableName: 'user_sessions', schema: 'public', timestampColumn: 'created_at', tenantColumn: 'user_id' },

  // Analytics Artifacts
  { category: 'ANALYTICS_ARTIFACTS', tableName: 'runs', schema: 'public', timestampColumn: 'created_at', tenantColumn: 'tenant_id' },
  { category: 'ANALYTICS_ARTIFACTS', tableName: 'analysis_results', schema: 'public', timestampColumn: 'created_at', tenantColumn: 'tenant_id' },
  { category: 'ANALYTICS_ARTIFACTS', tableName: 'search_analytics', schema: 'public', timestampColumn: 'created_at', tenantColumn: 'tenant_id' },

  // Predictive Models
  { category: 'PREDICTIVE_MODELS', tableName: 'risk_scores', schema: 'public', timestampColumn: 'created_at', tenantColumn: 'tenant_id' },
  { category: 'PREDICTIVE_MODELS', tableName: 'masint_signals', schema: 'public', timestampColumn: 'detected_at', tenantColumn: 'tenant_id' },

  // Audit Records
  { category: 'AUDIT_RECORDS', tableName: 'provenance_records', schema: 'public', timestampColumn: 'created_at', tenantColumn: 'tenant_id' },
  { category: 'AUDIT_RECORDS', tableName: 'audit_logs', schema: 'public', timestampColumn: 'created_at', tenantColumn: 'tenant_id' },

  // Tenant Data (Retention is managed by tenant lifecycle, not time-based expiration)
  { category: 'TENANT_DATA', tableName: 'cases', schema: 'maestro', timestampColumn: 'created_at', tenantColumn: 'tenant_id' },
  { category: 'TENANT_DATA', tableName: 'investigations', schema: 'public', timestampColumn: 'created_at', tenantColumn: 'tenant_id' },
];

export function getRetentionDays(period: string): number {
  if (period === 'infinity') return -1;
  const match = period.match(/^(\d+)([dmy])$/);
  if (!match) throw new Error(`Invalid retention period: ${period}`);
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 'd': return value;
    case 'm': return value * 30;
    case 'y': return value * 365;
    default: return 0;
  }
}
