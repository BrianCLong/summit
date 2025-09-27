export interface PartnerNotification {
  partnerId: string;
  contact: string;
  message: string;
}

export type PropagationDomain = 'caches' | 'indexes' | 'features' | 'exports';

export interface PurgeScope {
  caches?: string[];
  indexes?: string[];
  features?: string[];
  exports?: string[];
}

export interface EolPlan {
  datasetId: string;
  lastUse: string;
  successorDatasets?: string[];
  purgeScope: PurgeScope;
  partnerNotifications: PartnerNotification[];
}

export interface NormalizedPurgeScope {
  caches: string[];
  indexes: string[];
  features: string[];
  exports: string[];
}

export interface NormalizedPlan {
  datasetId: string;
  lastUse: string;
  successorDatasets: string[];
  purgeScope: NormalizedPurgeScope;
  partnerNotifications: PartnerNotification[];
  planId: string;
}

export interface Clock {
  now(): Date;
}

export interface ActionRecord {
  planId: string;
  datasetId: string;
  domain: PropagationDomain;
  target: string;
  status: 'purged';
  completedAt: string;
}

export interface PropagationSummary {
  caches: number;
  indexes: number;
  features: number;
  exports: number;
}

export interface NotificationEntry {
  planId: string;
  datasetId: string;
  partnerId: string;
  contact: string;
  message: string;
  notifiedAt: string;
}

export interface ReconciliationReport {
  planId: string;
  residuals: string[];
  isClean: boolean;
}

export interface EolReceipt {
  datasetId: string;
  planId: string;
  lastUse: string;
  successorDatasets: string[];
  purgeScope: NormalizedPurgeScope;
  completedAt: string;
  propagation: PropagationSummary;
  verification: ReconciliationReport;
  checksum: string;
}
