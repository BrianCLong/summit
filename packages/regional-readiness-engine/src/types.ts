export type RegionId = "united-states" | "european-union-germany" | "singapore";

export interface RegionCriteria {
  regionId: RegionId;
  go: string[];
  hold: string[];
  noGo: string[];
}

export interface RegulatoryRequirement {
  domain: "privacy" | "consumer" | "sector" | "labor" | "tax";
  regionId: RegionId;
  requirement: string;
  controlOwner: string;
}

export interface ControlMapping {
  name: string;
  description: string;
  owners: string[];
  epics: string[];
}

export interface Checklist {
  category: string;
  items: string[];
}

export interface SubprocessorEntry {
  name: string;
  approvedRegions: RegionId[];
  dataClasses: string[];
  evidenceUrl?: string;
}

export interface ResidencyControlState {
  residencyEnforced: boolean;
  kmsKeyId?: string;
  kmsRotationVerifiedAt?: Date;
  backupsVerified: boolean;
  egressAllowlist: RegionId[];
}

export interface CrossBorderAllowance {
  tenantId: string;
  fromRegion: RegionId;
  toRegion: RegionId;
  dataClasses: string[];
  purpose: string;
  expiresAt?: Date;
  approvedBy: string;
}

export interface LaunchGateEvidence {
  residency: ResidencyControlState;
  screeningLiveWithAuditTrails: boolean;
  exceptionRegistryExists: boolean;
  procurementPacketComplete: boolean;
  contractRidersVerified: boolean;
  taxReadinessVerified: boolean;
  localizationSmokeComplete: boolean;
  regionalSloDashboardsLive: boolean;
  loadTestsRun: boolean;
  failoverPostureLogged: boolean;
  supportRunbooksTested: boolean;
  helperServicesActive?: boolean;
}

export interface LaunchGateResult {
  ready: boolean;
  failures: string[];
}

export interface TabletopExerciseInputs {
  evidencePackReady: boolean;
  incidentCommsTemplatesReady: boolean;
  failoverPlaybookTested: boolean;
  dsarWorkflowAutomated: boolean;
  escalationSlaMet: boolean;
}

export interface TabletopResult {
  passed: boolean;
  gaps: string[];
}

export interface EvidenceEvent {
  type: "residency" | "screening" | "procurement" | "support" | "localization" | "performance";
  regionId: RegionId;
  timestamp: Date;
  payload: Record<string, unknown>;
}

export interface ResidencySimulationOutcome {
  scenario: string;
  residencyRiskScore: number;
  availabilityScore: number;
  recommendation: string;
}

export interface ScreeningQualityResult {
  falseNegativeRate: number;
  thresholdsAdjusted: boolean;
  newThreshold: number;
}
