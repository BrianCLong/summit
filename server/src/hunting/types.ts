/**
 * Threat Hunting Platform Type Definitions
 * Comprehensive types for agentic hunt queries and auto-remediation
 */

// =============================================================================
// CORE HUNTING TYPES
// =============================================================================

export interface HuntContext {
  huntId: string;
  scope: HuntScope;
  timeWindowHours: number;
  initiatedBy: string;
  initiatedAt: Date;
  status: HuntStatus;
  graphSchema: GraphSchemaInfo;
  recentAlerts: Alert[];
  baselineAnomalies: BaselineAnomaly[];
  activeThreats: ActiveThreat[];
  configuration: HuntConfiguration;
}

export type HuntScope = 'all' | 'network' | 'endpoint' | 'identity' | 'cloud' | 'custom';

export type HuntStatus =
  | 'initializing'
  | 'generating_hypotheses'
  | 'executing_queries'
  | 'analyzing_results'
  | 'enriching_findings'
  | 'remediating'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface HuntConfiguration {
  maxResultsPerQuery: number;
  confidenceThreshold: number;
  autoRemediate: boolean;
  remediationApprovalRequired: boolean;
  llmModel: string;
  llmTemperature: number;
  precisionMode: boolean;
  targetPrecision: number;
  ctiSources: string[];
  osintSources: string[];
}

export interface GraphSchemaInfo {
  nodeLabels: string[];
  relationshipTypes: string[];
  propertyKeys: Record<string, string[]>;
  indexes: IndexInfo[];
  constraints: ConstraintInfo[];
}

export interface IndexInfo {
  name: string;
  label: string;
  properties: string[];
  type: 'btree' | 'fulltext' | 'vector';
}

export interface ConstraintInfo {
  name: string;
  label: string;
  property: string;
  type: 'unique' | 'exists' | 'node_key';
}

// =============================================================================
// HYPOTHESIS AND QUERY TYPES
// =============================================================================

export interface ThreatHypothesis {
  id: string;
  statement: string;
  mitreAttackTechniques: MitreAttackTechnique[];
  requiredQueryTemplate: string;
  expectedIndicators: string[];
  confidenceLevel: number;
  priority: number;
  rationale: string;
  dataRequirements: string[];
}

export interface MitreAttackTechnique {
  id: string;
  name: string;
  tactic: string;
  description: string;
}

export interface GeneratedCypherQuery {
  id: string;
  hypothesisId: string;
  query: string;
  params: Record<string, unknown>;
  templateUsed: string;
  estimatedComplexity: number;
  estimatedResultSize: number;
  validationStatus: QueryValidationStatus;
  validationErrors: string[];
}

export interface QueryValidationStatus {
  isValid: boolean;
  hasLimit: boolean;
  isReadOnly: boolean;
  complexity: number;
  estimatedCost: number;
}

export interface QueryExecutionResult {
  queryId: string;
  hypothesisId: string;
  success: boolean;
  records: Record<string, unknown>[];
  recordCount: number;
  executionTimeMs: number;
  error?: string;
  metadata: {
    plannerUsed: string;
    dbHits: number;
    cacheHits: number;
  };
}

// =============================================================================
// FINDING AND ANALYSIS TYPES
// =============================================================================

export interface HuntFinding {
  id: string;
  hypothesisId: string;
  severity: ThreatSeverity;
  confidence: number;
  classification: ThreatClassification;
  entitiesInvolved: EntityReference[];
  iocsIdentified: IOCReference[];
  ttpsMatched: MitreAttackTechnique[];
  recommendedActions: RecommendedAction[];
  autoRemediationEligible: boolean;
  evidenceSummary: string;
  rawEvidence: Record<string, unknown>[];
  timestamp: Date;
  expiresAt?: Date;
}

export type ThreatSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type ThreatClassification =
  | 'MALWARE'
  | 'RANSOMWARE'
  | 'APT'
  | 'INSIDER_THREAT'
  | 'DATA_EXFILTRATION'
  | 'LATERAL_MOVEMENT'
  | 'PERSISTENCE'
  | 'CREDENTIAL_ACCESS'
  | 'COMMAND_AND_CONTROL'
  | 'RECONNAISSANCE'
  | 'SUPPLY_CHAIN'
  | 'UNKNOWN';

export interface EntityReference {
  id: string;
  type: string;
  name: string;
  riskScore: number;
  properties: Record<string, unknown>;
}

export interface IOCReference {
  id: string;
  type: IOCType;
  value: string;
  confidence: number;
  source: string;
  firstSeen: Date;
  lastSeen: Date;
  tags: string[];
}

export type IOCType =
  | 'IP_ADDRESS'
  | 'DOMAIN'
  | 'URL'
  | 'EMAIL'
  | 'FILE_HASH_MD5'
  | 'FILE_HASH_SHA1'
  | 'FILE_HASH_SHA256'
  | 'CERTIFICATE'
  | 'MUTEX'
  | 'REGISTRY_KEY'
  | 'USER_AGENT'
  | 'JA3'
  | 'YARA_RULE';

export interface RecommendedAction {
  id: string;
  type: ActionType;
  description: string;
  priority: number;
  automated: boolean;
  estimatedImpact: ImpactAssessment;
  prerequisites: string[];
  rollbackProcedure?: string;
}

export type ActionType =
  | 'BLOCK_IP'
  | 'BLOCK_DOMAIN'
  | 'QUARANTINE_FILE'
  | 'DISABLE_ACCOUNT'
  | 'REVOKE_CREDENTIALS'
  | 'ISOLATE_HOST'
  | 'KILL_PROCESS'
  | 'UPDATE_FIREWALL_RULE'
  | 'ALERT_TEAM'
  | 'CREATE_TICKET'
  | 'COLLECT_FORENSICS'
  | 'ESCALATE';

export interface ImpactAssessment {
  businessImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affectedSystems: number;
  estimatedDowntime: number;
  reversible: boolean;
}

// =============================================================================
// ENRICHMENT TYPES
// =============================================================================

export interface EnrichedFinding extends HuntFinding {
  ctiCorrelations: CTICorrelation[];
  osintData: OSINTData[];
  threatActorAttribution: ThreatActorAttribution[];
  campaignAssociations: CampaignAssociation[];
  enrichmentTimestamp: Date;
}

export interface CTICorrelation {
  source: string;
  feedName: string;
  matchedIOC: string;
  confidence: number;
  severity: ThreatSeverity;
  context: string;
  reportUrl?: string;
  lastUpdated: Date;
}

export interface OSINTData {
  source: string;
  type: 'paste' | 'forum' | 'social_media' | 'news' | 'blog' | 'repository';
  url?: string;
  content: string;
  relevanceScore: number;
  discoveredAt: Date;
}

export interface ThreatActorAttribution {
  actorId: string;
  actorName: string;
  aliases: string[];
  attributionConfidence: number;
  country?: string;
  motivation: string[];
  capabilities: string[];
  associatedCampaigns: string[];
}

export interface CampaignAssociation {
  campaignId: string;
  campaignName: string;
  active: boolean;
  startDate?: Date;
  endDate?: Date;
  targetSectors: string[];
  targetRegions: string[];
  associationConfidence: number;
}

// =============================================================================
// REMEDIATION TYPES
// =============================================================================

export interface RemediationPlan {
  id: string;
  huntId: string;
  findings: string[];
  actions: RemediationAction[];
  status: RemediationStatus;
  approvalRequired: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  executedAt?: Date;
  completedAt?: Date;
}

export interface RemediationAction {
  id: string;
  findingId: string;
  actionType: ActionType;
  target: RemediationTarget;
  parameters: Record<string, unknown>;
  status: RemediationActionStatus;
  executionOrder: number;
  dependsOn: string[];
  result?: RemediationResult;
  rollbackAction?: RemediationAction;
}

export interface RemediationTarget {
  type: string;
  id: string;
  name: string;
  environment: string;
  criticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export type RemediationStatus =
  | 'pending_approval'
  | 'approved'
  | 'executing'
  | 'completed'
  | 'partial_success'
  | 'failed'
  | 'rolled_back'
  | 'cancelled';

export type RemediationActionStatus =
  | 'pending'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'rolled_back';

export interface RemediationResult {
  success: boolean;
  message: string;
  timestamp: Date;
  affectedEntities: string[];
  metrics: {
    entitiesProcessed: number;
    entitiesSuccessful: number;
    entitiesFailed: number;
    executionTimeMs: number;
  };
  errors?: string[];
  rollbackAvailable: boolean;
}

// =============================================================================
// BASELINE AND ANOMALY TYPES
// =============================================================================

export interface BaselineAnomaly {
  id: string;
  type: AnomalyType;
  entityId: string;
  entityType: string;
  metric: string;
  expectedValue: number;
  observedValue: number;
  deviation: number;
  detectedAt: Date;
  confidence: number;
}

export type AnomalyType =
  | 'volume_spike'
  | 'unusual_time'
  | 'new_connection'
  | 'behavior_change'
  | 'frequency_change'
  | 'geographic_anomaly';

export interface ActiveThreat {
  id: string;
  name: string;
  type: ThreatClassification;
  severity: ThreatSeverity;
  status: 'active' | 'monitoring' | 'contained' | 'resolved';
  firstDetected: Date;
  lastActivity: Date;
  affectedAssets: string[];
  iocs: string[];
  ttps: string[];
}

export interface Alert {
  id: string;
  ruleName: string;
  severity: ThreatSeverity;
  timestamp: Date;
  sourceEntity: string;
  description: string;
  relatedIOCs: string[];
  acknowledged: boolean;
}

// =============================================================================
// LLM CHAIN TYPES
// =============================================================================

export interface LLMChainConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  chainType: LLMChainType;
  systemPrompt: string;
  userPromptTemplate: string;
  outputParser: OutputParserType;
  context?: Record<string, unknown>;
  validation?: LLMOutputValidation;
}

export type LLMChainType =
  | 'hypothesis_generation'
  | 'cypher_generation'
  | 'result_analysis'
  | 'remediation_planning'
  | 'report_generation';

export type OutputParserType =
  | 'json'
  | 'json_hypotheses'
  | 'json_queries'
  | 'json_findings'
  | 'text'
  | 'structured';

export interface LLMOutputValidation {
  schema?: Record<string, unknown>;
  requiredFields?: string[];
  maxLength?: number;
  customValidator?: string;
}

export interface LLMChainResult<T> {
  success: boolean;
  output: T;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  latencyMs: number;
  model: string;
  validationPassed: boolean;
  validationErrors?: string[];
}

// =============================================================================
// HUNT REPORT TYPES
// =============================================================================

export interface HuntReport {
  id: string;
  huntId: string;
  title: string;
  executiveSummary: string;
  generatedAt: Date;
  generatedBy: string;
  sections: ReportSection[];
  metrics: HuntMetrics;
  attachments: ReportAttachment[];
  format: 'json' | 'pdf' | 'html' | 'markdown';
  url?: string;
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'summary' | 'findings' | 'iocs' | 'remediation' | 'recommendations' | 'metrics' | 'timeline';
  content: string | Record<string, unknown>;
  visualizations?: Visualization[];
}

export interface Visualization {
  type: 'graph' | 'timeline' | 'table' | 'chart' | 'map';
  title: string;
  data: Record<string, unknown>;
  config: Record<string, unknown>;
}

export interface HuntMetrics {
  totalHypothesesTested: number;
  totalQueriesExecuted: number;
  totalFindingsDiscovered: number;
  findingsBySeverity: Record<ThreatSeverity, number>;
  findingsByClassification: Record<string, number>;
  iocsDiscovered: number;
  entitiesAnalyzed: number;
  precisionEstimate: number;
  falsePositiveRate: number;
  executionTimeMs: number;
  llmTokensUsed: number;
  remediationActionsExecuted: number;
  remediationSuccessRate: number;
}

export interface ReportAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

// =============================================================================
// EVENT AND NOTIFICATION TYPES
// =============================================================================

export interface HuntEvent {
  type: HuntEventType;
  huntId: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

export type HuntEventType =
  | 'hunt_started'
  | 'hunt_completed'
  | 'hunt_failed'
  | 'hypothesis_generated'
  | 'query_executed'
  | 'finding_discovered'
  | 'remediation_started'
  | 'remediation_completed'
  | 'alert_triggered';

export interface NotificationConfig {
  channels: NotificationChannel[];
  payload: Record<string, unknown>;
  template?: string;
}

export interface NotificationChannel {
  type: 'slack' | 'pagerduty' | 'email' | 'webhook' | 'teams';
  config: Record<string, unknown>;
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

export interface StartHuntRequest {
  scope?: HuntScope;
  timeWindowHours?: number;
  configuration?: Partial<HuntConfiguration>;
  customHypotheses?: Partial<ThreatHypothesis>[];
  targetEntities?: string[];
  excludeEntities?: string[];
}

export interface StartHuntResponse {
  huntId: string;
  status: HuntStatus;
  estimatedDuration: number;
  startedAt: Date;
}

export interface HuntStatusResponse {
  huntId: string;
  status: HuntStatus;
  progress: number;
  currentPhase: string;
  findingsCount: number;
  elapsedTimeMs: number;
  estimatedRemainingMs: number;
}

export interface HuntResultsResponse {
  huntId: string;
  status: HuntStatus;
  findings: EnrichedFinding[];
  metrics: HuntMetrics;
  report?: HuntReport;
  completedAt?: Date;
}
