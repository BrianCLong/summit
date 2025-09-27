export type SchemaChangeType =
  | 'added-field'
  | 'removed-field'
  | 'type-changed'
  | 'constraint-changed';

export interface SchemaChange {
  changeType: SchemaChangeType;
  field: string;
  dataTypeBefore?: string;
  dataTypeAfter?: string;
  classificationBefore?: string;
  classificationAfter?: string;
  piiCategory?: string;
  sensitivityScore?: number;
  requiresBackfill?: boolean;
  breaking?: boolean;
  notes?: string;
  sunsetReason?: string;
}

export interface DistributionShift {
  feature: string;
  metric: string;
  magnitude: number;
  direction?: 'increase' | 'decrease';
  sampleSize?: number;
  materiality?: 'low' | 'medium' | 'high';
}

export interface GovernanceContext {
  baselineSlo?: {
    availability?: number;
    latencyMs?: number;
    freshnessMinutes?: number;
  };
  contractualSla?: {
    availability?: number;
    latencyMs?: number;
  };
  baselineCostMonthlyUsd?: number;
  expectedTrafficMtu?: number;
  owners?: Array<{
    name: string;
    contact: string;
  }>;
  modelsImpacted?: string[];
  retrainThresholds?: Record<string, number>;
}

export interface DatasetDiff {
  datasetId: string;
  diffId?: string;
  seed?: number;
  previousVersion?: string;
  currentVersion?: string;
  governanceContext?: GovernanceContext;
  schemaChanges: SchemaChange[];
  distributionShifts: DistributionShift[];
  dpBudget?: {
    previousEpsilon: number;
    currentEpsilon: number;
    consumptionDelta: number;
  };
  contractsImpacted?: Array<{
    name: string;
    sla?: {
      availability?: number;
      latencyMs?: number;
    };
    channels?: string[];
  }>;
  caches?: Array<{
    name: string;
    dependsOnSchema?: boolean;
  }>;
}

export interface PolicyTagUpdate {
  field: string;
  requiredTags: string[];
  reason: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ContractRenegotiationFlag {
  contract: string;
  reason: string;
  renegotiationWindow: string;
  channels: string[];
}

export interface DPBudgetRecalculation {
  dataset: string;
  currentEpsilon: number;
  proposedEpsilon: number;
  reason: string;
  windowDays: number;
}

export interface CachePurge {
  cache: string;
  scope: 'full' | 'partial';
  reason: string;
  requiresBackfill: boolean;
}

export interface RetrainNotice {
  models: string[];
  featuresImpacted: string[];
  metric: string;
  magnitude: number;
  deadline: string;
  reason: string;
}

export interface ChangeControlMapping {
  change: string;
  requiredControls: string[];
  justification: string;
  severity: 'low' | 'medium' | 'high';
}

export interface GovernanceActions {
  policyTagUpdates: PolicyTagUpdate[];
  contractRenegotiationFlags: ContractRenegotiationFlag[];
  dpBudgetRecalculations: DPBudgetRecalculation[];
  cachePurges: CachePurge[];
  retrainNotices: RetrainNotice[];
  changeControlMatrix: ChangeControlMapping[];
}

export interface ImpactDriverDelta {
  name: string;
  latencyDeltaMs: number;
  availabilityDelta: number;
  freshnessDeltaMinutes: number;
  costDeltaMonthlyUsd: number;
}

export interface ImpactProjection {
  datasetId: string;
  scenario: string;
  timeHorizonDays: number;
  baseline: {
    availability: number;
    latencyMs: number;
    freshnessMinutes: number;
    costMonthlyUsd: number;
  };
  projected: {
    availability: number;
    latencyMs: number;
    freshnessMinutes: number;
    costMonthlyUsd: number;
  };
  drivers: ImpactDriverDelta[];
  notes: string[];
}

export interface GovernanceActionPlan {
  planVersion: string;
  datasetId: string;
  diffId: string;
  generatedAt: string;
  deterministicSeed: string;
  previousVersion?: string;
  currentVersion?: string;
  governanceOwners: GovernanceContext['owners'];
  governanceActions: GovernanceActions;
  impactForecast: ImpactProjection;
  signature?: PlanSignature;
}

export interface PlanSignature {
  algorithm: string;
  keyId: string;
  publicKey: string;
  signedAt: string;
  signature: string;
  canonicalHash: string;
}

export interface GeneratePlanOptions {
  signingKeyPem?: string;
  signingKeyId?: string;
  publicKeyPem?: string;
  deterministicSeed?: string;
}
