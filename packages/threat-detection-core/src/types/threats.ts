/**
 * Threat model types
 */

import { ThreatCategory, ThreatSeverity } from './events';

export interface ThreatIndicator {
  type: 'ip' | 'domain' | 'url' | 'hash' | 'email' | 'file' | 'cve' | 'signature';
  value: string;
  confidence: number;
  source: string;
  firstSeen: Date;
  lastSeen: Date;
  tags?: string[];
}

export interface ThreatActor {
  id: string;
  name: string;
  aliases: string[];
  description: string;
  sophistication: 'novice' | 'intermediate' | 'advanced' | 'expert' | 'nation_state';
  motivation: string[];
  targetedSectors: string[];
  targetedCountries: string[];
  knownTtps: string[]; // MITRE ATT&CK technique IDs
  indicators: ThreatIndicator[];
  firstObserved: Date;
  lastActivity: Date;
  confidence: number;
}

export interface Campaign {
  id: string;
  name: string;
  threatActorId?: string;
  startDate: Date;
  endDate?: Date;
  active: boolean;
  objectives: string[];
  ttps: string[];
  indicators: ThreatIndicator[];
  affectedEntities: string[];
  estimatedImpact: ThreatSeverity;
}

export interface KillChainStage {
  stage: 'reconnaissance' | 'weaponization' | 'delivery' | 'exploitation' | 'installation' | 'command_control' | 'actions_on_objectives';
  detected: boolean;
  timestamp?: Date;
  indicators: string[];
  mitigation?: string;
}

export interface AttackTimeline {
  attackId: string;
  startTime: Date;
  endTime?: Date;
  killChainStages: KillChainStage[];
  mitreTactics: {
    tactic: string;
    techniques: {
      id: string;
      name: string;
      detected: boolean;
      timestamp?: Date;
      evidence: string[];
    }[];
  }[];
  events: string[]; // Event IDs
  severity: ThreatSeverity;
  status: 'ongoing' | 'mitigated' | 'contained' | 'resolved';
}

export interface APTIndicators {
  id: string;
  targetEntityId: string;

  // Long-term tracking
  dwellTime: number; // Milliseconds
  firstCompromise: Date;
  lastActivity: Date;

  // Stealth indicators
  lowAndSlowActivity: boolean;
  encryptedC2: boolean;
  livingOffTheLand: boolean;
  legitimateToolAbuse: boolean;

  // Multi-stage indicators
  stages: {
    stage: string;
    completed: boolean;
    timestamp?: Date;
    techniques: string[];
  }[];

  // Persistence mechanisms
  persistenceMethods: string[];

  // Attribution
  suspectedThreatActor?: string;
  confidence: number;

  // Impact
  estimatedScope: {
    compromisedSystems: number;
    exfiltratedData: number; // bytes
    affectedUsers: number;
  };
}

export interface TTPPattern {
  id: string;
  name: string;
  description: string;

  // MITRE ATT&CK mapping
  tactics: string[];
  techniques: string[];
  subTechniques?: string[];

  // Detection logic
  detectionRule: {
    type: 'signature' | 'behavioral' | 'statistical' | 'ml';
    conditions: any; // Detection-specific conditions
    threshold?: number;
  };

  // Context
  prevalence: 'rare' | 'uncommon' | 'common' | 'very_common';
  falsePositiveRate: number;
  severity: ThreatSeverity;

  // Metadata
  references: string[];
  relatedTtps: string[];
}

export interface DataIntegrityThreat {
  id: string;
  timestamp: Date;
  dataSourceId: string;
  threatType: 'poisoning' | 'manipulation' | 'corruption' | 'tampering';

  // Detection details
  anomalyScore: number;
  detectionMethod: 'statistical' | 'checksumMismatch' | 'schemaViolation' | 'outlierDetection';

  // Affected data
  affectedRecords: number;
  affectedFields: string[];
  sampleRecords?: any[];

  // Statistical indicators
  statisticalDrift?: {
    metric: string;
    expectedValue: number;
    actualValue: number;
    standardDeviations: number;
  }[];

  // Source validation
  sourceReputation: number;
  sourceAuthenticated: boolean;
  chainOfCustody: boolean;

  // Impact
  severity: ThreatSeverity;
  confidenceScore: number;
}
