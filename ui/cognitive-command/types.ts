// Summit Cognitive Command Center — Core Types

// ============================================================
// COMMAND CENTER MODES & LAYOUT
// ============================================================

export type CommandMode = 'observe' | 'investigate' | 'forecast' | 'simulate' | 'intervene' | 'govern';

export interface WorkspaceLayout {
  id: string;
  name: string;
  panels: PanelConfig[];
  mode: CommandMode;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean;
}

export interface PanelConfig {
  id: string;
  type: string;
  position: { x: number; y: number; width: number; height: number };
  props: Record<string, unknown>;
  minimized?: boolean;
  pinned?: boolean;
}

export interface CommandContext {
  activeMode: CommandMode;
  activeMissionId: string | null;
  activeInvestigationId: string | null;
  layout: WorkspaceLayout;
  operatorId: string;
  sessionId: string;
  startedAt: string;
}

// ============================================================
// FORECASTS & FORESIGHT
// ============================================================

export type ForecastStatus = 'draft' | 'active' | 'expired' | 'invalidated' | 'confirmed';
export type ConfidenceLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';

export interface Forecast {
  id: string;
  title: string;
  description: string;
  status: ForecastStatus;
  probability: number; // 0-1
  confidence: ConfidenceLevel;
  timeHorizon: string; // ISO duration
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  indicators: LeadingIndicator[];
  branches: ForecastBranch[];
  evidenceBasis: string[];
  linkedMissionIds: string[];
  linkedEntityIds: string[];
  source: 'cwmi' | 'vtii' | 'evolution' | 'threat_intel' | 'agent' | 'analyst';
  tags: string[];
}

export interface ForecastBranch {
  id: string;
  forecastId: string;
  label: string;
  probability: number;
  confidence: ConfidenceLevel;
  description: string;
  assumptions: string[];
  outcomes: BranchOutcome[];
  interventionIds: string[];
  isBaseline: boolean;
}

export interface BranchOutcome {
  metric: string;
  baselineValue: number;
  projectedValue: number;
  unit: string;
  timeframe: string;
}

export interface LeadingIndicator {
  id: string;
  name: string;
  currentValue: number;
  threshold: number;
  direction: 'rising' | 'falling' | 'stable' | 'volatile';
  significance: 'low' | 'medium' | 'high' | 'critical';
  lastUpdated: string;
}

export interface ProbabilityShift {
  forecastId: string;
  timestamp: string;
  previousProbability: number;
  newProbability: number;
  driver: string;
  evidenceIds: string[];
}

// ============================================================
// WORLD STATE & WORLD MODEL
// ============================================================

export interface WorldStateSnapshot {
  id: string;
  timestamp: string;
  dimensions: WorldDimension[];
  overallStability: number; // 0-1
  changeVelocity: number;
  activeThreatCount: number;
  keyDrivers: string[];
  metadata: Record<string, unknown>;
}

export type DimensionType = 'geopolitical' | 'technical' | 'narrative' | 'economic' | 'social' | 'environmental' | 'military';

export interface WorldDimension {
  type: DimensionType;
  state: 'stable' | 'shifting' | 'volatile' | 'critical';
  score: number; // 0-100
  trend: 'improving' | 'stable' | 'degrading' | 'unknown';
  factors: WorldFactor[];
}

export interface WorldFactor {
  id: string;
  name: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
  impact: 'low' | 'medium' | 'high' | 'critical';
  linkedEntityIds: string[];
}

export interface StateTransition {
  id: string;
  fromStateId: string;
  toStateId: string;
  probability: number;
  drivers: string[];
  timestamp: string;
  type: 'observed' | 'projected' | 'simulated';
}

export interface HistoricalAnalog {
  id: string;
  title: string;
  description: string;
  period: string;
  similarity: number; // 0-1
  keyParallels: string[];
  keyDifferences: string[];
  outcome: string;
  relevantDimensions: DimensionType[];
  linkedForecastIds: string[];
}

// ============================================================
// NARRATIVE BATTLESPACE
// ============================================================

export type NarrativeStance = 'adversarial' | 'defensive' | 'neutral' | 'allied' | 'unknown';

export interface NarrativeCluster {
  id: string;
  label: string;
  description: string;
  stance: NarrativeStance;
  reach: number;
  velocity: number; // spread rate
  coherence: number; // 0-1
  firstSeen: string;
  lastActive: string;
  sourceCount: number;
  messageCount: number;
  themes: string[];
  linkedEntityIds: string[];
  linkedActorIds: string[];
  channels: string[];
  sentiment: number; // -1 to 1
}

export interface InfluenceFlow {
  id: string;
  sourceClusterId: string;
  targetClusterId: string;
  strength: number; // 0-1
  direction: 'push' | 'pull' | 'amplify' | 'counter';
  mechanism: string;
  detectedAt: string;
  confidence: number;
}

export interface PropagationEvent {
  id: string;
  narrativeClusterId: string;
  timestamp: string;
  channel: string;
  amplificationFactor: number;
  reachDelta: number;
  actorId?: string;
  isCoordinated: boolean;
}

export interface CounterNarrative {
  id: string;
  targetClusterId: string;
  strategy: string;
  status: 'planned' | 'active' | 'paused' | 'completed' | 'abandoned';
  effectiveness: number; // 0-1
  messages: string[];
  channels: string[];
  createdBy: string;
  createdAt: string;
}

// ============================================================
// DECISION & INTERVENTION
// ============================================================

export type InterventionStatus = 'draft' | 'proposed' | 'approved' | 'executing' | 'completed' | 'rejected' | 'withdrawn';

export interface InterventionOption {
  id: string;
  title: string;
  objective: string;
  target: string;
  mechanism: string;
  constraints: string[];
  forecastEffect: BranchOutcome[];
  downsideRisk: string[];
  confidence: ConfidenceLevel;
  evidenceBasis: string[];
  costEstimate: CostEstimate;
  relevantSimulationIds: string[];
  linkedNarrativeIds: string[];
  linkedEntityIds: string[];
  linkedMissionIds: string[];
  status: InterventionStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CostEstimate {
  financial: number;
  personnel: number;
  timeWeeks: number;
  politicalCapital: 'none' | 'low' | 'medium' | 'high' | 'extreme';
  opportunityCost: string;
}

export interface DecisionRecord {
  id: string;
  title: string;
  context: string;
  options: InterventionOption[];
  selectedOptionId: string | null;
  rationale: string;
  assumptions: string[];
  constraints: string[];
  decidedBy: string;
  decidedAt: string | null;
  status: 'pending' | 'decided' | 'executing' | 'reviewing' | 'closed';
  outcomeReviewId?: string;
  linkedMissionIds: string[];
  auditTrail: AuditEntry[];
}

export interface AuditEntry {
  timestamp: string;
  actor: string;
  action: string;
  details: string;
  metadata?: Record<string, unknown>;
}

// ============================================================
// AUTONOMOUS AGENTS
// ============================================================

export type AgentStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'awaiting_approval' | 'escalated';

export interface AutonomousTask {
  id: string;
  agentId: string;
  taskDescription: string;
  status: AgentStatus;
  confidence: number;
  evidenceCount: number;
  model: string;
  runtime: string;
  recentActions: AgentAction[];
  policyState: 'compliant' | 'warning' | 'violation' | 'pending_review';
  escalationReason?: string;
  missionId?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  outputs: AgentOutput[];
  toolUsage: ToolUsageRecord[];
  safetyBoundaries: SafetyBoundary[];
}

export interface AgentAction {
  id: string;
  timestamp: string;
  type: string;
  description: string;
  result: 'success' | 'failure' | 'pending';
  metadata?: Record<string, unknown>;
}

export interface AgentOutput {
  id: string;
  type: 'finding' | 'lead' | 'insight' | 'recommendation' | 'alert';
  content: string;
  confidence: number;
  evidenceIds: string[];
  timestamp: string;
}

export interface ToolUsageRecord {
  tool: string;
  invocations: number;
  lastUsed: string;
  status: 'allowed' | 'restricted' | 'blocked';
}

export interface SafetyBoundary {
  type: string;
  limit: number;
  current: number;
  status: 'within' | 'approaching' | 'exceeded';
}

// ============================================================
// MISSIONS
// ============================================================

export type MissionState = 'green' | 'watch' | 'degraded' | 'critical' | 'decision_required';

export interface MissionCommandState {
  id: string;
  title: string;
  description: string;
  state: MissionState;
  priority: 'low' | 'medium' | 'high' | 'critical';
  objective: string;
  progress: number; // 0-100
  startDate: string;
  targetDate?: string;
  assignedAnalysts: string[];
  activeAgentIds: string[];
  activeSimulationIds: string[];
  intelligenceGaps: IntelligenceGap[];
  blockers: MissionBlocker[];
  dependencies: MissionDependency[];
  threats: string[];
  opportunities: string[];
  recommendations: string[];
  createdAt: string;
  updatedAt: string;
  lastReviewedAt?: string;
  tags: string[];
}

export interface IntelligenceGap {
  id: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'partially_filled' | 'filled';
  assignedTo?: string;
}

export interface MissionBlocker {
  id: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'mitigated' | 'resolved';
  linkedDependencyId?: string;
}

export interface MissionDependency {
  id: string;
  sourceMissionId: string;
  targetMissionId: string;
  type: 'blocks' | 'informs' | 'requires' | 'supports';
  status: 'pending' | 'satisfied' | 'blocked';
}

// ============================================================
// COGNITIVE INSIGHTS
// ============================================================

export type InsightCategory = 'anomaly' | 'hidden_relationship' | 'threat_signal' | 'forecast_shift' | 'narrative_shift' | 'mission_blocker' | 'intervention_opportunity' | 'governance_concern';

export interface CognitiveInsight {
  id: string;
  title: string;
  description: string;
  category: InsightCategory;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  explanation: string; // Why the system surfaced this
  evidenceIds: string[];
  linkedEntityIds: string[];
  linkedMissionIds: string[];
  linkedForecastIds: string[];
  linkedNarrativeIds: string[];
  status: 'new' | 'triaged' | 'investigating' | 'actioned' | 'dismissed';
  triagedBy?: string;
  triagedAt?: string;
  createdAt: string;
  relatedInsightIds: string[];
}

// ============================================================
// GOVERNANCE
// ============================================================

export type GateStatus = 'open' | 'pending_approval' | 'approved' | 'rejected' | 'override';

export interface GovernanceGate {
  id: string;
  name: string;
  description: string;
  status: GateStatus;
  policyId: string;
  triggerCondition: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiredApprovers: string[];
  currentApprovals: ApprovalRecord[];
  forecastedRisk: number;
  constraints: string[];
  linkedDecisionId?: string;
  linkedMissionId?: string;
  createdAt: string;
  updatedAt: string;
  deadline?: string;
  auditTrail: AuditEntry[];
}

export interface ApprovalRecord {
  approverId: string;
  decision: 'approved' | 'rejected' | 'abstained';
  rationale: string;
  timestamp: string;
  conditions?: string[];
}

export interface OutcomeReview {
  id: string;
  decisionId: string;
  interventionId: string;
  predictedOutcomes: BranchOutcome[];
  actualOutcomes: BranchOutcome[];
  variance: number;
  assessment: string;
  lessonsLearned: string[];
  reviewedBy: string;
  reviewedAt: string;
  linkedForecastIds: string[];
}

// ============================================================
// COMMAND PALETTE
// ============================================================

export interface CommandAction {
  id: string;
  label: string;
  description?: string;
  category: string;
  shortcut?: string;
  icon?: string;
  action: string;
  params?: Record<string, unknown>;
  requiresPermission?: string;
}

export interface WorkflowMacro {
  id: string;
  name: string;
  description: string;
  steps: CommandAction[];
  createdBy: string;
  createdAt: string;
  shortcut?: string;
  isFavorite?: boolean;
}

// ============================================================
// PERFORMANCE TELEMETRY
// ============================================================

export interface PerformanceMetrics {
  renderLatency: number;
  eventThroughput: number;
  panelLoadTime: number;
  graphLayoutTime: number;
  commandExecutionTime: number;
  timestamp: string;
}
