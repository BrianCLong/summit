/**
 * MITRE ATT&CK Tactics
 */
export enum MITRETactic {
  RECONNAISSANCE = 'reconnaissance',
  RESOURCE_DEVELOPMENT = 'resource-development',
  INITIAL_ACCESS = 'initial-access',
  EXECUTION = 'execution',
  PERSISTENCE = 'persistence',
  PRIVILEGE_ESCALATION = 'privilege-escalation',
  DEFENSE_EVASION = 'defense-evasion',
  CREDENTIAL_ACCESS = 'credential-access',
  DISCOVERY = 'discovery',
  LATERAL_MOVEMENT = 'lateral-movement',
  COLLECTION = 'collection',
  COMMAND_AND_CONTROL = 'command-and-control',
  EXFILTRATION = 'exfiltration',
  IMPACT = 'impact'
}

/**
 * Kill Chain Phases
 */
export enum KillChainPhase {
  RECONNAISSANCE = 'reconnaissance',
  WEAPONIZATION = 'weaponization',
  DELIVERY = 'delivery',
  EXPLOITATION = 'exploitation',
  INSTALLATION = 'installation',
  COMMAND_AND_CONTROL = 'command-and-control',
  ACTIONS_ON_OBJECTIVES = 'actions-on-objectives'
}

/**
 * Attack Technique
 */
export interface AttackTechnique {
  id: string;
  name: string;
  tactic: MITRETactic;
  description: string;
  platforms: string[];
  permissions?: string[];
  dataSources?: string[];
  detection?: string;
  mitigation?: string;
  references?: string[];
}

/**
 * Attack Scenario
 */
export interface AttackScenario {
  id: string;
  name: string;
  description: string;
  objectives: string[];
  techniques: AttackTechnique[];
  killChainPhases: KillChainPhase[];
  targetEnvironment: TargetEnvironment;
  timeline: ScenarioTimeline;
  successCriteria: SuccessCriterion[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Target Environment
 */
export interface TargetEnvironment {
  type: 'cloud' | 'on-premise' | 'hybrid';
  platforms: string[];
  assets: TargetAsset[];
  networkTopology: NetworkTopology;
  securityControls: SecurityControl[];
}

/**
 * Target Asset
 */
export interface TargetAsset {
  id: string;
  name: string;
  type: 'server' | 'workstation' | 'network-device' | 'application' | 'database' | 'cloud-service';
  os?: string;
  services: string[];
  vulnerabilities: string[];
  criticality: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Network Topology
 */
export interface NetworkTopology {
  zones: NetworkZone[];
  connections: NetworkConnection[];
}

export interface NetworkZone {
  id: string;
  name: string;
  type: 'dmz' | 'internal' | 'external' | 'management';
  assets: string[];
}

export interface NetworkConnection {
  sourceZone: string;
  targetZone: string;
  protocols: string[];
  ports: number[];
}

/**
 * Security Control
 */
export interface SecurityControl {
  id: string;
  type: 'firewall' | 'ids' | 'ips' | 'edr' | 'siem' | 'waf' | 'dlp' | 'mfa';
  name: string;
  coverage: string[];
  effectiveness: number;
}

/**
 * Scenario Timeline
 */
export interface ScenarioTimeline {
  phases: TimelinePhase[];
  totalDuration: number;
  milestones: Milestone[];
}

export interface TimelinePhase {
  name: string;
  startTime: number;
  endTime: number;
  techniques: string[];
  objectives: string[];
}

export interface Milestone {
  name: string;
  time: number;
  criteria: string[];
}

/**
 * Success Criterion
 */
export interface SuccessCriterion {
  id: string;
  description: string;
  metric: string;
  target: number;
  achieved?: boolean;
  actualValue?: number;
}

/**
 * Campaign Result
 */
export interface CampaignResult {
  campaignId: string;
  scenarioId: string;
  startTime: Date;
  endTime: Date;
  status: 'planned' | 'in-progress' | 'completed' | 'aborted';
  phases: PhaseResult[];
  techniquesUsed: TechniqueResult[];
  objectivesAchieved: string[];
  detectionsTriggered: Detection[];
  findings: Finding[];
  recommendations: Recommendation[];
  metrics: CampaignMetrics;
}

export interface PhaseResult {
  phase: KillChainPhase;
  status: 'success' | 'partial' | 'failed' | 'skipped';
  startTime: Date;
  endTime: Date;
  actions: ActionResult[];
}

export interface TechniqueResult {
  techniqueId: string;
  name: string;
  executionTime: Date;
  success: boolean;
  detected: boolean;
  notes: string;
}

export interface ActionResult {
  id: string;
  action: string;
  target: string;
  success: boolean;
  output?: string;
  timestamp: Date;
}

export interface Detection {
  id: string;
  source: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  description: string;
  iocGenerated?: string[];
}

export interface Finding {
  id: string;
  severity: 'informational' | 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedAssets: string[];
  technique?: string;
  evidence: string[];
  remediation: string;
}

export interface Recommendation {
  id: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  relatedFindings: string[];
}

export interface CampaignMetrics {
  totalTechniques: number;
  successfulTechniques: number;
  detectedTechniques: number;
  meanTimeToDetect?: number;
  meanTimeToRespond?: number;
  coveragePercentage: number;
  riskScore: number;
}

/**
 * Social Engineering Types
 */
export enum SocialEngineeringType {
  PHISHING = 'phishing',
  SPEAR_PHISHING = 'spear-phishing',
  WHALING = 'whaling',
  VISHING = 'vishing',
  SMISHING = 'smishing',
  PRETEXTING = 'pretexting',
  BAITING = 'baiting',
  QUID_PRO_QUO = 'quid-pro-quo',
  TAILGATING = 'tailgating',
  WATERING_HOLE = 'watering-hole'
}

/**
 * Social Engineering Campaign
 */
export interface SocialEngineeringCampaign {
  id: string;
  type: SocialEngineeringType;
  name: string;
  description: string;
  targets: SocialTarget[];
  content: CampaignContent;
  schedule: CampaignSchedule;
  metrics: SocialMetrics;
  status: 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled';
}

export interface SocialTarget {
  id: string;
  email?: string;
  phone?: string;
  department?: string;
  role?: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface CampaignContent {
  subject?: string;
  body: string;
  sender: string;
  attachments?: string[];
  landingPage?: string;
  callToAction: string;
}

export interface CampaignSchedule {
  startDate: Date;
  endDate: Date;
  sendTimes: Date[];
  followUpDays: number[];
}

export interface SocialMetrics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  submitted: number;
  reported: number;
  openRate: number;
  clickRate: number;
  submissionRate: number;
  reportRate: number;
}

/**
 * Attack Surface
 */
export interface AttackSurface {
  id: string;
  organizationId: string;
  lastScan: Date;
  assets: SurfaceAsset[];
  exposures: Exposure[];
  riskScore: number;
}

export interface SurfaceAsset {
  id: string;
  type: 'domain' | 'ip' | 'service' | 'application' | 'certificate' | 'cloud-resource';
  identifier: string;
  firstSeen: Date;
  lastSeen: Date;
  attributes: Record<string, unknown>;
  risks: AssetRisk[];
}

export interface Exposure {
  id: string;
  assetId: string;
  type: 'open-port' | 'vulnerable-service' | 'misconfiguration' | 'data-leak' | 'weak-credential';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  remediation: string;
}

export interface AssetRisk {
  id: string;
  category: string;
  score: number;
  factors: string[];
}
