export type ThreatSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface BehaviorEvent {
  id?: string;
  entityId: string;
  actor?: string;
  action: string;
  timestamp: number;
  value?: number;
  attributes?: Record<string, unknown>;
  context?: {
    ip?: string;
    userAgent?: string;
    geo?: string;
    sessionId?: string;
  };
}

export interface EntityProfile {
  id: string;
  aliases?: string[];
  attributes?: Record<string, string | number | boolean>;
  labels?: string[];
}

export interface BehaviorInsight {
  entityId: string;
  action: string;
  score: number;
  confidence: number;
  rationale: string[];
  zScore?: number;
  trend?: 'spike' | 'drop' | 'drift' | 'oscillation';
}

export interface PatternMatch {
  entityId: string;
  pattern: string;
  weight: number;
  evidence: string[];
  window: BehaviorEvent[];
}

export interface TemporalInsight {
  entityId: string;
  dwellTimeMs?: number;
  burstRate?: number;
  recentActivity: BehaviorEvent[];
}

export interface ThreatIntelIndicator {
  id: string;
  value: string;
  type: 'ip' | 'hash' | 'domain' | 'email' | 'uri' | 'user';
  confidence: number;
  source: 'MISP' | 'STIX' | 'TAXII' | 'custom';
  tags?: string[];
  validUntil?: string;
}

export interface ThreatIntelOptions {
  /** Minimum acceptable confidence for an indicator (0-100). */
  minConfidence?: number;
  /** Optional clock to simplify testing; defaults to `Date.now`. */
  now?: () => number;
}

export interface CorrelatedFinding {
  entityId: string;
  indicators: ThreatIntelIndicator[];
  relatedEntities: string[];
  strength: number;
  notes: string[];
}

export interface RuleContext {
  event: BehaviorEvent;
  behavior?: BehaviorInsight;
  patterns?: PatternMatch[];
  temporal?: TemporalInsight;
  indicators?: ThreatIntelIndicator[];
}

export interface DetectionRule {
  id: string;
  description: string;
  severity: ThreatSeverity;
  condition: (context: RuleContext) => boolean;
  tags?: string[];
}

export interface ThreatScore {
  entityId: string;
  score: number;
  severity: ThreatSeverity;
  components: Record<string, number>;
  notes: string[];
}

export interface TriageAction {
  type:
    | 'watch'
    | 'isolate'
    | 'investigate'
    | 'block-indicator'
    | 'open-ticket'
    | 'collect-forensics';
  reason: string;
  owner?: string;
}

export interface TriagePlan {
  entityId: string;
  severity: ThreatSeverity;
  actions: TriageAction[];
}

export interface ThreatAlert {
  id: string;
  entityId: string;
  title: string;
  description: string;
  severity: ThreatSeverity;
  score: number;
  indicators: ThreatIntelIndicator[];
  patternMatches: PatternMatch[];
  behavior?: BehaviorInsight;
  temporal?: TemporalInsight;
  triage: TriagePlan;
  createdAt: string;
  ruleIds?: string[];
}

export interface ThreatIntelClient {
  name: string;
  fetchIndicators(): Promise<ThreatIntelIndicator[]>;
}

export interface ThreatAnalyticsOptions {
  behavior?: {
    windowSize?: number;
    zThreshold?: number;
    minObservations?: number;
  };
  patternLibrary?: {
    name: string;
    weight: number;
    match: (events: BehaviorEvent[]) => boolean;
    description: string;
  }[];
  rules?: DetectionRule[];
  intel?: ThreatIntelOptions;
}

export interface IOActorActivity {
  actorId: string;
  timestamp: number;
  content?: string;
  urls?: string[];
  templateId?: string;
  attributes?: Record<string, unknown>;
}

export interface IOActorGraphEdge {
  source: string;
  target: string;
  weight?: number;
  type?: string;
}

export interface IOActorScore {
  actorId: string;
  compositeScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  signals: {
    synchrony: number;
    sharedUrls: number;
    templateSimilarity: number;
    graphCentrality: number;
  };
  evidence: string[];
}

export interface IOActorScoringOptions {
  synchronyWindowMs?: number;
  weights?: Partial<IOActorScore['signals']>;
  evidenceThresholds?: Partial<IOActorScore['signals']>;
  riskThresholds?: {
    medium?: number;
    high?: number;
    critical?: number;
  };
}

export interface CascadeNode {
  id: string;
  actorId: string;
  reach?: number;
  timestamp?: number;
}

export interface CascadeEdge {
  source: string;
  target: string;
}

export interface CascadeGraph {
  nodes: CascadeNode[];
  edges: CascadeEdge[];
}

export interface CausalImpactResult {
  removedActorIds: string[];
  removedNodeIds: string[];
  affectedNodeIds: string[];
  baselineReach: number;
  counterfactualReach: number;
  reachDelta: number;
  baselineDepth: number;
  counterfactualDepth: number;
  depthDelta: number;
  baselineBreadth: number;
  counterfactualBreadth: number;
  breadthDelta: number;
}

export interface CausalImpactOptions {
  defaultReach?: number;
}
