export type Tier = 'T0' | 'T1' | 'T2' | 'T3';

export interface TierTargets {
  rpoMinutes: number;
  rtoMinutes: number;
  restoreVerificationCadenceDays: number;
  drillCadenceDays: number;
}

export interface RunbookReference {
  path: string;
  roles: string[];
  lastReviewedAt: string;
}

export interface BackupStatus {
  schedule: string;
  lastBackupAt: string;
  lastRestoreVerifiedAt: string;
  restoreDurationMinutes: number;
  dataLossMinutes: number;
  evidencePath: string;
}

export interface DrEnvironment {
  runnable: boolean;
  smokeCommand: string;
  lastSmokeAt: string;
}

export interface DrillRecord {
  type: 'restore' | 'chaos' | 'rollback' | 'gameday';
  executedAt: string;
  durationMinutes: number;
  dataLossMinutes?: number;
  result: 'pass' | 'fail';
  notes?: string;
}

export interface Dependency {
  name: string;
  type: 'db' | 'queue' | 'auth' | 'external-api' | 'cache' | 'stream';
  owner: string;
  criticality: 'critical' | 'high' | 'medium' | 'low';
  timeoutsMs: number;
  retries: number;
  circuitBreaker: {
    failureThreshold: number;
    resetSeconds: number;
  };
  bulkhead: {
    tenantIsolation: boolean;
    featureIsolation: boolean;
    queueDepthLimit: number;
  };
  gracefulDegradation: {
    mode: string;
    testedAt: string;
  };
  cacheStrategy?: {
    scope: string;
    ttlSeconds: number;
  };
  sla: {
    availability: number;
    latencyMsP99: number;
  };
  failStrategy: 'fail-open' | 'fail-closed';
  killSwitch: {
    present: boolean;
    lastTestedAt: string;
    coverage: string[];
  };
  chaosTests: {
    lastSimulatedAt: string;
    scenario: string;
  };
  escalation: {
    contact: string;
    vendorChannel?: string;
  };
}

export interface CapacityProfile {
  peakRps: number;
  scenarios: string[];
  p95LatencyBudgetMs: number;
  throughputBudgetRps: number;
  autoscaling: {
    minReplicas: number;
    maxReplicas: number;
    cooldownSeconds: number;
  };
  backpressure: {
    queueCap: number;
    shedLoadAboveMs: number;
    timeoutMs: number;
  };
  quotas: {
    perTenantRps: number;
  };
  dashboards: string[];
  forecastHorizonDays: number;
  brownoutMode: {
    enabled: boolean;
    lastTestedAt: string;
    strategy: string;
  };
}

export interface DataIntegrityPlan {
  riskyWritePaths: string[];
  idempotencyKeys: string[];
  invariants: string[];
  reconciliationJobs: {
    cadence: string;
    exceptionQueue: string;
  };
  eventLog: {
    enabled: boolean;
    topics: string[];
  };
  outbox: {
    enabled: boolean;
  };
  dualControl: {
    enabled: boolean;
    scope: string[];
  };
  quarantine: {
    enabled: boolean;
    rules: string[];
  };
  integrityChecks: {
    restoreHashValidation: boolean;
    recordCounts: boolean;
  };
  correctnessScorecard: {
    driftFindings: number;
    mttrMinutes: number;
  };
}

export interface ReleaseSafetyPlan {
  progressiveStages: string[];
  rollbackTriggers: string[];
  featureFlagGovernance: {
    owner: string;
    expiryDays: number;
    killSwitch: boolean;
  };
  migrationSafety: {
    lockBudgetSeconds: number;
    rollbackPlan: string;
  };
  blastRadiusLabels: string[];
  verificationSuites: string[];
  releaseMarkers: string[];
  breakGlass: {
    process: string;
    auditPath: string;
  };
  rollbackDrills: {
    frequencyDays: number;
    lastRunAt: string;
  };
  changeFailureRate: number;
}

export interface ObservabilityPlan {
  structuredLogging: boolean;
  correlationIds: boolean;
  tracingCoverage: string[];
  sloDashboards: string[];
  syntheticMonitors: string[];
  entityTimeline: boolean;
  alertDeepLinks: boolean;
  anomalyDetection: boolean;
  perTenantSignals: boolean;
  mttrMinutes: number;
  mttaMinutes: number;
  timeToInnocenceMinutes: number;
  telemetryCostControls: {
    sampling: boolean;
    retentionTiers: boolean;
  };
}

export interface ChaosPlan {
  calendar: {
    quarter: string;
    scenarios: string[];
    owner: string;
  }[];
  tooling: {
    blastRadiusCapPercent: number;
    approvalsRequired: boolean;
  };
  mitigationBacklog: {
    openItems: number;
    lastUpdatedAt: string;
  };
  killSwitchesVerifiedAt: string;
  drIncluded: boolean;
  score: number;
}

export interface MultiRegionPlan {
  strategy: 'active-active' | 'active-passive' | 'single-az';
  regions: string[];
  healthChecks: boolean;
  replicationLagSeconds: number;
  regionalDashboards: boolean;
  regionalDeployPipelines: boolean;
  failoverDrillAt: string;
  crossRegionChattyCalls: boolean;
  secretsStandardized: boolean;
  vendorPlan: boolean;
  adr: string;
}

export interface GovernancePlan {
  errorBudgets: {
    journey: string;
    monthlyMinutes: number;
    burnedMinutes: number;
  }[];
  riskRegister: {
    risk: string;
    owner: string;
    mitigationSlaDays: number;
    status: 'open' | 'in-progress' | 'closed';
  }[];
  postmortemsRequireSystemicFix: boolean;
  reliabilityReleaseCadenceDays: number;
  ownershipComplete: boolean;
  killSwitchRegistryTestDays: number;
  lastAuditAt: string;
  incentives: boolean;
}

export interface ServicePlan {
  name: string;
  tier: Tier;
  owners: string[];
  dependencies: Dependency[];
  backup: BackupStatus;
  runbook: RunbookReference;
  drEnvironment: DrEnvironment;
  drills: DrillRecord[];
  capacity: CapacityProfile;
  dataIntegrity: DataIntegrityPlan;
  releaseSafety: ReleaseSafetyPlan;
  observability: ObservabilityPlan;
  chaos: ChaosPlan;
  multiRegion: MultiRegionPlan;
  governance: GovernancePlan;
}

export interface ResiliencePlan {
  services: ServicePlan[];
  artifactRegistry: string[];
}

export interface EpicResult {
  epic: string;
  status: 'pass' | 'fail';
  findings: string[];
}

export interface ValidationReport {
  overallStatus: 'pass' | 'fail';
  results: EpicResult[];
}
