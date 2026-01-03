// Adversarial Defense Platform Types

// MITRE ATT&CK Types
export type MitreTactic =
  | 'reconnaissance'
  | 'resource-development'
  | 'initial-access'
  | 'execution'
  | 'persistence'
  | 'privilege-escalation'
  | 'defense-evasion'
  | 'credential-access'
  | 'discovery'
  | 'lateral-movement'
  | 'collection'
  | 'command-and-control'
  | 'exfiltration'
  | 'impact';

export interface MitreTechnique {
  id: string;
  name: string;
  tactic: MitreTactic;
  description: string;
  platforms: string[];
  dataSources: string[];
  detectionMethods: string[];
  mitigations: string[];
  subTechniques?: MitreTechnique[];
}

// Adversary Types
export type ThreatLevel = 'low' | 'medium' | 'high' | 'critical';
export type AdversaryType = 'apt' | 'cybercrime' | 'hacktivist' | 'insider' | 'nation-state' | 'unknown';

export interface Adversary {
  id: string;
  name: string;
  aliases: string[];
  type: AdversaryType;
  threatLevel: ThreatLevel;
  description: string;
  originCountry?: string;
  targetSectors: string[];
  targetRegions: string[];
  techniques: string[];
  malware: string[];
  tools: string[];
  campaigns: string[];
  firstSeen: string;
  lastSeen: string;
  active: boolean;
  confidence: number;
  references: string[];
  tags: string[];
}

// Detection Types
export type DetectionStatus = 'new' | 'investigating' | 'confirmed' | 'false-positive' | 'resolved';
export type DetectionSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface Detection {
  id: string;
  name: string;
  description: string;
  severity: DetectionSeverity;
  status: DetectionStatus;
  technique: string;
  tactic: MitreTactic;
  adversary?: string;
  source: string;
  timestamp: string;
  affectedAssets: string[];
  indicators: string[];
  evidence: Evidence[];
  assignee?: string;
  notes: string[];
}

export interface Evidence {
  id: string;
  type: 'log' | 'file' | 'network' | 'memory' | 'registry' | 'process';
  source: string;
  content: string;
  timestamp: string;
  hash?: string;
}

// Incident Types
export type IncidentStatus = 'open' | 'investigating' | 'containing' | 'eradicating' | 'recovering' | 'closed';
export type IncidentPriority = 'p1' | 'p2' | 'p3' | 'p4';

export interface Incident {
  id: string;
  title: string;
  description: string;
  status: IncidentStatus;
  priority: IncidentPriority;
  severity: DetectionSeverity;
  detections: string[];
  adversary?: string;
  campaign?: string;
  affectedAssets: string[];
  timeline: IncidentEvent[];
  responseActions: ResponseAction[];
  playbook?: string;
  assignee?: string;
  team: string[];
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  rootCause?: string;
  lessonsLearned?: string;
}

export interface IncidentEvent {
  id: string;
  timestamp: string;
  type: 'detection' | 'action' | 'note' | 'status-change' | 'assignment';
  description: string;
  actor?: string;
  metadata?: Record<string, unknown>;
}

export interface ResponseAction {
  id: string;
  name: string;
  description: string;
  type: 'containment' | 'eradication' | 'recovery' | 'investigation';
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'skipped';
  automated: boolean;
  assignee?: string;
  startedAt?: string;
  completedAt?: string;
  output?: string;
}

// Campaign Types
export type CampaignStatus = 'active' | 'dormant' | 'concluded';

export interface Campaign {
  id: string;
  name: string;
  description: string;
  adversary: string;
  status: CampaignStatus;
  objectives: string[];
  targetSectors: string[];
  targetRegions: string[];
  techniques: string[];
  phases: CampaignPhase[];
  iocs: IOC[];
  incidents: string[];
  firstSeen: string;
  lastSeen: string;
  confidence: number;
}

export interface CampaignPhase {
  id: string;
  name: string;
  description: string;
  tactics: MitreTactic[];
  techniques: string[];
  startDate: string;
  endDate?: string;
  status: 'planned' | 'active' | 'completed';
}

// IOC Types
export type IOCType =
  | 'ip'
  | 'domain'
  | 'url'
  | 'hash-md5'
  | 'hash-sha1'
  | 'hash-sha256'
  | 'email'
  | 'file-path'
  | 'registry'
  | 'mutex'
  | 'user-agent'
  | 'certificate'
  | 'asn';

export type TLPLevel = 'white' | 'green' | 'amber' | 'red';

export interface IOC {
  id: string;
  type: IOCType;
  value: string;
  description?: string;
  adversary?: string;
  campaign?: string;
  confidence: number;
  tlp: TLPLevel;
  firstSeen: string;
  lastSeen: string;
  hitCount: number;
  whitelisted: boolean;
  tags: string[];
  source: string;
  expiresAt?: string;
}

// Alert Types
export type AlertSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type AlertCategory = 'detection' | 'ioc-match' | 'behavior' | 'policy' | 'system' | 'threat-intel';
export type AlertStatus = 'new' | 'acknowledged' | 'investigating' | 'resolved' | 'dismissed';

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  category: AlertCategory;
  status: AlertStatus;
  source: string;
  timestamp: string;
  relatedEntity?: string;
  relatedEntityType?: 'adversary' | 'campaign' | 'detection' | 'incident' | 'ioc';
  metadata?: Record<string, unknown>;
  assignee?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: AlertCondition[];
  severity: AlertSeverity;
  category: AlertCategory;
  actions: AlertAction[];
  cooldownMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface AlertCondition {
  field: string;
  operator: 'equals' | 'contains' | 'regex' | 'gt' | 'lt' | 'gte' | 'lte';
  value: string | number;
}

export interface AlertAction {
  type: 'email' | 'slack' | 'webhook' | 'ticket' | 'playbook';
  config: Record<string, unknown>;
}

// Playbook Types
export type PlaybookCategory =
  | 'incident-response'
  | 'threat-hunting'
  | 'vulnerability'
  | 'compliance'
  | 'recovery'
  | 'custom';

export type PlaybookStepType = 'manual' | 'automated' | 'decision' | 'notification' | 'integration';

export interface Playbook {
  id: string;
  name: string;
  description: string;
  category: PlaybookCategory;
  version: string;
  steps: PlaybookStep[];
  triggerConditions?: AlertCondition[];
  estimatedDuration: number;
  author: string;
  createdAt: string;
  updatedAt: string;
  executionCount: number;
  avgExecutionTime: number;
  successRate: number;
  tags: string[];
}

export interface PlaybookStep {
  id: string;
  name: string;
  description: string;
  type: PlaybookStepType;
  order: number;
  automated: boolean;
  action?: string;
  parameters?: Record<string, unknown>;
  nextStepOnSuccess?: string;
  nextStepOnFailure?: string;
  timeout?: number;
  assignee?: string;
}

// Threat Intelligence Types
export interface ThreatIntelItem {
  id: string;
  title: string;
  description: string;
  type: 'report' | 'indicator' | 'advisory' | 'campaign' | 'malware' | 'tool';
  tlp: TLPLevel;
  source: string;
  publishedAt: string;
  adversaries: string[];
  techniques: string[];
  iocs: string[];
  confidence: number;
  relevanceScore: number;
  tags: string[];
  url?: string;
}

// Risk Types
export type RiskLevel = 'minimal' | 'low' | 'medium' | 'high' | 'critical';

export interface RiskScore {
  overall: number;
  level: RiskLevel;
  breakdown: RiskCategory[];
  previousScore?: number;
  trend: 'improving' | 'stable' | 'worsening';
  calculatedAt: string;
}

export interface RiskCategory {
  name: string;
  score: number;
  weight: number;
  factors: RiskFactor[];
}

export interface RiskFactor {
  name: string;
  value: number;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

// Metrics Types
export type MetricCategory = 'detection' | 'response' | 'prevention' | 'compliance' | 'risk';
export type MetricTrend = 'up' | 'down' | 'stable';
export type MetricStatus = 'good' | 'warning' | 'critical';

export interface SecurityMetric {
  id: string;
  name: string;
  description: string;
  category: MetricCategory;
  value: number;
  unit: string;
  target?: number;
  threshold?: {
    warning: number;
    critical: number;
  };
  trend: MetricTrend;
  trendValue: number;
  history: MetricDataPoint[];
  status: MetricStatus;
}

export interface MetricDataPoint {
  timestamp: string;
  value: number;
}

// Graph Types
export type GraphNodeType = 'adversary' | 'technique' | 'malware' | 'tool' | 'campaign' | 'target' | 'ioc';
export type GraphRelationType = 'uses' | 'targets' | 'attributed_to' | 'associated_with' | 'variant_of' | 'delivers';

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  properties: Record<string, unknown>;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: GraphRelationType;
  properties?: Record<string, unknown>;
}

export interface ThreatGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Defense Strategy Types
export type DefenseCategory = 'prevention' | 'detection' | 'response' | 'recovery';
export type DefenseStatus = 'planned' | 'implementing' | 'active' | 'deprecated';

export interface DefenseStrategy {
  id: string;
  name: string;
  description: string;
  category: DefenseCategory;
  status: DefenseStatus;
  techniques: string[];
  controls: string[];
  coverage: number;
  effectiveness: number;
  cost: 'low' | 'medium' | 'high';
  priority: number;
  implementedAt?: string;
  reviewedAt?: string;
}

// Simulation Types
export type SimulationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  adversary?: string;
  techniques: string[];
  objectives: string[];
  status: SimulationStatus;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  results?: SimulationResults;
}

export interface SimulationResults {
  detected: number;
  blocked: number;
  evaded: number;
  successRate: number;
  avgDetectionTime: number;
  recommendations: string[];
  findings: SimulationFinding[];
}

export interface SimulationFinding {
  technique: string;
  result: 'detected' | 'blocked' | 'evaded';
  detectionTime?: number;
  details: string;
}

// Tactic Event for Timeline
export interface TacticEvent {
  id: string;
  timestamp: string;
  tactic: MitreTactic;
  technique: string;
  description: string;
  severity: DetectionSeverity;
  adversary?: string;
  campaign?: string;
  detected: boolean;
}

// Filter Types
export interface AdversarialFilters {
  threatLevel?: ThreatLevel[];
  adversaryType?: AdversaryType[];
  tactics?: MitreTactic[];
  dateRange?: {
    start: string;
    end: string;
  };
  searchQuery?: string;
  status?: string[];
  tags?: string[];
}
