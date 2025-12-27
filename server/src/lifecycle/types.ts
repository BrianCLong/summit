export type DataCategory =
  | 'OPERATIONAL_METADATA'
  | 'ANALYTICS_ARTIFACTS'
  | 'PREDICTIVE_MODELS'
  | 'AUDIT_RECORDS'
  | 'TENANT_DATA';

export type RetentionPeriod = '30d' | '90d' | '1y' | '7y' | 'infinity';

export type DeletionMode = 'hard' | 'soft' | 'crypto-shred';

export interface LifecyclePolicy {
  category: DataCategory;
  retention: RetentionPeriod;
  deletionMode: DeletionMode;
  legalHoldEligible: boolean;
  description: string;
}

export interface TableMapping {
  category: DataCategory;
  tableName: string;
  schema?: string;
  timestampColumn: string;
  tenantColumn?: string;
}

export interface LifecycleEvent {
  id: string;
  type: 'EXPIRATION' | 'DELETION' | 'LEGAL_HOLD_START' | 'LEGAL_HOLD_END';
  targetType: 'tenant' | 'user' | 'data_category';
  targetId: string;
  timestamp: Date;
  details: Record<string, any>;
}
