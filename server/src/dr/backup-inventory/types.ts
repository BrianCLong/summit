export type BackupStoreType = 's3' | 'gcs' | 'azure_blob' | 'local' | 'nfs';
export type BackupScope = 'full' | 'incremental' | 'differential' | 'log';
export type BackupFrequency = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'continuous';

export interface BackupTarget {
  id: string;
  name: string;
  storeType: BackupStoreType;
  scope: BackupScope;
  frequency: BackupFrequency;
  retentionDays: number;
  encrypted: boolean;
  lastSuccessAt?: Date;
  lastFailureAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BackupPolicy {
  id: string;
  minRetentionDays: number;
  requireEncryption: boolean;
  maxStalenessHours: number; // e.g. 24 hours
}

export interface PolicyFinding {
  ruleId: string;
  targetId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  remediationHint: string;
}

export interface BackupInventoryReport {
  generatedAt: Date;
  totalTargets: number;
  findings: PolicyFinding[];
}
