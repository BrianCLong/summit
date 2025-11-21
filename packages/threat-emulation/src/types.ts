/**
 * Threat Actor Categories
 */
export enum ThreatActorCategory {
  APT = 'apt',
  NATION_STATE = 'nation-state',
  CYBERCRIME = 'cybercrime',
  HACKTIVIST = 'hacktivist',
  INSIDER = 'insider',
  SCRIPT_KIDDIE = 'script-kiddie'
}

/**
 * Threat Actor Motivation
 */
export enum ThreatActorMotivation {
  ESPIONAGE = 'espionage',
  FINANCIAL = 'financial',
  DISRUPTION = 'disruption',
  DESTRUCTION = 'destruction',
  IDEOLOGY = 'ideology',
  COERCION = 'coercion',
  REVENGE = 'revenge',
  UNKNOWN = 'unknown'
}

/**
 * Threat Actor Profile
 */
export interface ThreatActorProfile {
  id: string;
  names: string[];
  category: ThreatActorCategory;
  motivation: ThreatActorMotivation[];
  attribution: Attribution;
  capabilities: ActorCapabilities;
  targetedSectors: string[];
  targetedRegions: string[];
  ttps: TTPProfile;
  campaigns: Campaign[];
  infrastructure: Infrastructure;
  tools: ActorTool[];
  malware: ActorMalware[];
  aliases: string[];
  references: Reference[];
  firstSeen: Date;
  lastSeen: Date;
  active: boolean;
}

export interface Attribution {
  country?: string;
  confidence: 'high' | 'medium' | 'low';
  sponsorship?: 'state-sponsored' | 'state-affiliated' | 'independent';
  evidence: string[];
}

export interface ActorCapabilities {
  sophistication: 'low' | 'medium' | 'high' | 'advanced';
  resources: 'limited' | 'moderate' | 'extensive';
  persistence: 'opportunistic' | 'targeted' | 'persistent';
  stealthLevel: 'low' | 'medium' | 'high';
  zeroDayUsage: boolean;
  customTooling: boolean;
}

/**
 * TTP Profile
 */
export interface TTPProfile {
  tactics: TacticUsage[];
  techniques: TechniqueUsage[];
  procedures: Procedure[];
  signatures: Signature[];
}

export interface TacticUsage {
  tacticId: string;
  name: string;
  frequency: 'always' | 'often' | 'sometimes' | 'rarely';
}

export interface TechniqueUsage {
  techniqueId: string;
  name: string;
  frequency: 'always' | 'often' | 'sometimes' | 'rarely';
  variants: string[];
  tools: string[];
}

export interface Procedure {
  id: string;
  techniqueId: string;
  description: string;
  commands?: string[];
  artifacts?: string[];
  detection?: string;
}

export interface Signature {
  id: string;
  type: 'network' | 'host' | 'file' | 'behavior';
  description: string;
  pattern: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Campaign
 */
export interface Campaign {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate?: Date;
  targetedSectors: string[];
  targetedRegions: string[];
  objectives: string[];
  techniques: string[];
  malware: string[];
  iocs: CampaignIOC[];
}

export interface CampaignIOC {
  type: 'ip' | 'domain' | 'hash' | 'url' | 'email';
  value: string;
  context: string;
}

/**
 * Infrastructure
 */
export interface Infrastructure {
  c2Patterns: C2Pattern[];
  domains: DomainPattern[];
  hosting: string[];
  registrars: string[];
  vpnUsage: boolean;
  torUsage: boolean;
  bulletproofHosting: boolean;
}

export interface C2Pattern {
  protocol: string;
  port: number;
  encryption: boolean;
  beaconInterval?: number;
  jitter?: number;
  description: string;
}

export interface DomainPattern {
  pattern: string;
  tlds: string[];
  registrationPattern: string;
}

/**
 * Actor Tool
 */
export interface ActorTool {
  name: string;
  type: 'commercial' | 'opensource' | 'custom';
  category: 'rat' | 'backdoor' | 'loader' | 'exploit' | 'utility' | 'framework';
  description: string;
  techniques: string[];
}

/**
 * Actor Malware
 */
export interface ActorMalware {
  name: string;
  type: 'trojan' | 'backdoor' | 'ransomware' | 'wiper' | 'worm' | 'dropper' | 'loader';
  variants: string[];
  capabilities: string[];
  techniques: string[];
  hashes?: string[];
}

export interface Reference {
  title: string;
  url: string;
  source: string;
  date: Date;
}

/**
 * Emulation Plan
 */
export interface EmulationPlan {
  id: string;
  name: string;
  description: string;
  threatActor: string;
  objectives: string[];
  phases: EmulationPhase[];
  techniques: EmulationTechnique[];
  timeline: EmulationTimeline;
  scope: EmulationScope;
  safetyChecks: SafetyCheck[];
  rollback: RollbackPlan;
  metrics: EmulationMetrics;
}

export interface EmulationPhase {
  id: string;
  name: string;
  order: number;
  techniques: string[];
  duration: number;
  checkpoints: string[];
}

export interface EmulationTechnique {
  techniqueId: string;
  name: string;
  procedure: string;
  tools: string[];
  commands: string[];
  expectedOutcome: string;
  detectionOpportunities: string[];
  safeMode: boolean;
}

export interface EmulationTimeline {
  startDate: Date;
  endDate: Date;
  phases: Array<{
    phaseId: string;
    start: Date;
    end: Date;
  }>;
}

export interface EmulationScope {
  targetSystems: string[];
  targetNetworks: string[];
  excludedSystems: string[];
  excludedNetworks: string[];
  authorization: string;
}

export interface SafetyCheck {
  id: string;
  description: string;
  condition: string;
  action: 'pause' | 'abort' | 'notify';
}

export interface RollbackPlan {
  steps: string[];
  timeEstimate: number;
  contacts: string[];
}

export interface EmulationMetrics {
  techniquesExecuted: number;
  techniquesSuccessful: number;
  detectionsCaused: number;
  meanTimeToDetect: number;
  coverageScore: number;
}
