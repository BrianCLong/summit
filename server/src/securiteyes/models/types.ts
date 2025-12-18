export const NODE_LABELS = {
  THREAT_ACTOR: 'ThreatActor',
  CAMPAIGN: 'Campaign',
  INTRUSION_SET: 'IntrusionSet',
  TTP: 'TTP',
  INDICATOR: 'Indicator',
  SUSPICIOUS_EVENT: 'SuspiciousEvent',
  ABUSE_PATTERN: 'AbusePattern',
  INSIDER_RISK_PROFILE: 'InsiderRiskProfile',
  DECEPTION_ASSET: 'DeceptionAsset',
  INVESTIGATION: 'Investigation',
  MITIGATION: 'Mitigation',
  THREAT_INTEL_FEED: 'ThreatIntelFeed',
  INCIDENT: 'Incident',
  ASSET: 'Asset',
  TENANT: 'Tenant',
};

export const RELATIONSHIPS = {
  ATTRIBUTED_TO: 'ATTRIBUTED_TO',
  USES_TTP: 'USES_TTP',
  INDICATES: 'INDICATES',
  OBSERVED_IN: 'OBSERVED_IN',
  SUSPICIOUS_FOR: 'SUSPICIOUS_FOR',
  PART_OF_INVESTIGATION: 'PART_OF_INVESTIGATION',
  MITIGATED_BY: 'MITIGATED_BY',
  TARGETS: 'TARGETS',
  LURED_BY: 'LURED_BY',
  RAISED_FROM: 'RAISED_FROM',
  SUPPORTED_BY: 'SUPPORTED_BY',
  HAS_RISK_PROFILE: 'HAS_RISK_PROFILE',
  TRIGGERED_BY: 'TRIGGERED_BY',
};

export interface BaseNode {
  id: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ThreatActor extends BaseNode {
  name: string;
  aliases: string[];
  confidence: number;
  description?: string;
}

export interface Campaign extends BaseNode {
  name: string;
  status: 'active' | 'inactive' | 'archived';
  goal?: string;
  timeline?: string;
}

export interface IntrusionSet extends BaseNode {
  name: string;
  description?: string;
}

export interface TTP extends BaseNode {
  techniqueId: string;
  name: string;
  tactic: string;
  description?: string;
}

export interface Indicator extends BaseNode {
  type: 'ip' | 'domain' | 'hash' | 'url' | 'user-agent' | 'other';
  value: string;
  source: string;
  firstSeen?: string;
  lastSeen?: string;
}

export interface SuspiciousEvent extends BaseNode {
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
  sourceDetector: string;
  timestamp: string;
}

export interface AbusePattern extends BaseNode {
  patternType: string;
  description: string;
}

export interface InsiderRiskProfile extends BaseNode {
  principalId: string;
  riskScore: number;
  riskFactors: Record<string, any>;
  lastAssessment: string;
}

export interface DeceptionAsset extends BaseNode {
  assetType: 'token' | 'data' | 'repo' | 'tenant';
  fakeConfig: Record<string, any>;
  triggered: boolean;
}

export interface Incident extends BaseNode {
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'detected' | 'triage' | 'contained' | 'eradicated' | 'recovered' | 'lessons_learned';
  summary?: string;
  resolvedAt?: string;
}

export interface Mitigation extends BaseNode {
  type: string;
  description: string;
  active: boolean;
}

export interface ThreatIntelFeed extends BaseNode {
  name: string;
  url?: string;
  sourceType: string;
  lastFetch?: string;
}

export interface Investigation extends BaseNode {
  title: string;
  status: 'open' | 'closed';
  summary?: string;
}
