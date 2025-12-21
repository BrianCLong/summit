export type ModuleClassification = 'GROW' | 'MAINTAIN' | 'MERGE' | 'RETIRE';

export interface TelemetrySnapshot {
  timestamp: string;
  activeUsers: number;
  requests: number;
  errors: number;
}

export interface SegmentImpact {
  segment: string;
  impactTier: 'LOW' | 'MEDIUM' | 'HIGH';
  notes?: string;
}

export interface CompatWindow {
  startsAt: string;
  endsAt: string;
  cohorts: string[];
  toggleableByCohort?: boolean;
}

export interface DeprecationPlan {
  calendarId: string;
  segments: SegmentImpact[];
  compat: CompatWindow;
  exceptionPolicy: string[];
}

export interface MigrationAdapter {
  name: string;
  description: string;
  sourceContract: string;
  targetContract: string;
  registeredAt: string;
}

export interface UISurfaceReduction {
  targetRemovalPercent: number;
  actualRemovalPercent: number;
  baselineUsage: number;
  postChangeUsage: number;
  measuredAt: string;
}

export interface ModuleRecord {
  id: string;
  name: string;
  owner: string;
  outcomes: string[];
  features: string[];
  usage: number;
  revenue: number;
  incidentRate: number;
  classification: ModuleClassification;
  classificationReason?: string;
  horizonMonths: number;
  duplicateOutcomeArea?: string;
  canonicalPath?: string;
  telemetry: TelemetrySnapshot[];
  deprecationPlan?: DeprecationPlan;
  migrationAdapters: MigrationAdapter[];
  uiSurfaceReduction?: UISurfaceReduction;
  retiredAt?: string;
  featureFreeze?: boolean;
  featureFreezeApprovedBy?: string;
}

export interface DuplicateOutcomeArea {
  name: string;
  modules: string[];
  canonicalModuleId: string;
  detectedAt: string;
  evidence: string;
}

export interface RemovalEvent {
  moduleId: string;
  removedAt: string;
  speedGainMs: number;
  reliabilityGainPct: number;
  supportLoadDelta: number;
}

export interface CompatModeToggle {
  cohort: string;
  enabled: boolean;
  reason: string;
  expiresAt?: string;
  toggledAt: string;
}

export type FeatureUsageGraph = Record<string, { outcome: string; count: number }[]>;

export interface RationalizationState {
  modules: Record<string, ModuleRecord>;
  duplicateOutcomeAreas: DuplicateOutcomeArea[];
  compatModes: CompatModeToggle[];
  removalEvents: RemovalEvent[];
}
