/**
 * Intelligence OS — Core type definitions
 *
 * Shared types for Investigation Memory, Agent Copilots, Narrative Intelligence,
 * Automated Insight Discovery, Mission Dashboards, and Intelligence Search.
 */

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export type EntityId = string;
export type InvestigationId = string;
export type MissionId = string;
export type NarrativeId = string;
export type InsightId = string;

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type Confidence = number; // 0–1

export interface TimeRange {
  start: string; // ISO-8601
  end: string;
}

// ---------------------------------------------------------------------------
// IntelGraph primitives (mirrors server schema)
// ---------------------------------------------------------------------------

export interface Entity {
  id: EntityId;
  type: string;
  label: string;
  properties: Record<string, unknown>;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Relationship {
  id: string;
  sourceId: EntityId;
  targetId: EntityId;
  type: string;
  properties: Record<string, unknown>;
  confidence: Confidence;
}

export interface IntelEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  entityIds: EntityId[];
  sourceIds: string[];
  metadata: Record<string, unknown>;
}

export interface Source {
  id: string;
  type: string;
  name: string;
  url?: string;
  reliability: Confidence;
  retrievedAt: string;
}

// ---------------------------------------------------------------------------
// Phase 1 — Investigation Memory
// ---------------------------------------------------------------------------

export interface Hypothesis {
  id: string;
  text: string;
  status: 'proposed' | 'supported' | 'refuted' | 'inconclusive';
  confidence: Confidence;
  evidenceIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Evidence {
  id: string;
  type: string;
  content: string;
  sourceId: string;
  entityIds: EntityId[];
  reliability: Confidence;
  collectedAt: string;
}

export interface AnalystNote {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  entityIds: EntityId[];
  createdAt: string;
}

export interface AgentFinding {
  id: string;
  agentId: string;
  agentName: string;
  type: string;
  summary: string;
  detail: Record<string, unknown>;
  confidence: Confidence;
  discoveredAt: string;
}

export interface InvestigationMemory {
  investigationId: InvestigationId;
  title: string;
  status: 'active' | 'paused' | 'closed';
  entities: Entity[];
  events: IntelEvent[];
  hypotheses: Hypothesis[];
  evidence: Evidence[];
  analystNotes: AnalystNote[];
  agentFindings: AgentFinding[];
  timeline: TimelineEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface TimelineEntry {
  id: string;
  timestamp: string;
  type: 'event' | 'hypothesis' | 'evidence' | 'note' | 'finding' | 'entity_added' | 'status_change';
  refId: string;
  summary: string;
}

// ---------------------------------------------------------------------------
// Phase 2 — Agent Copilots
// ---------------------------------------------------------------------------

export interface CopilotMessage {
  id: string;
  role: 'user' | 'copilot' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface CopilotSuggestion {
  id: string;
  type: 'query' | 'connection' | 'investigation' | 'osint' | 'action';
  title: string;
  description: string;
  confidence: Confidence;
  actionPayload?: Record<string, unknown>;
}

export interface CopilotTask {
  id: string;
  type: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number; // 0–100
  result?: Record<string, unknown>;
  startedAt: string;
  completedAt?: string;
}

export interface CopilotContext {
  investigationId?: InvestigationId;
  selectedEntityIds: EntityId[];
  visibleEntityIds: EntityId[];
  activeTimeRange?: TimeRange;
  currentView: string;
}

// ---------------------------------------------------------------------------
// Phase 3 — Narrative Intelligence
// ---------------------------------------------------------------------------

export interface Narrative {
  id: NarrativeId;
  title: string;
  summary: string;
  arcs: NarrativeArc[];
  entityIds: EntityId[];
  eventIds: string[];
  sourceIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NarrativeArc {
  id: string;
  label: string;
  events: NarrativeEvent[];
  sentiment: number; // -1 to 1
  trend: 'escalating' | 'stable' | 'de-escalating';
}

export interface NarrativeEvent {
  id: string;
  eventId: string;
  position: number;
  annotation?: string;
}

export interface NarrativeConflict {
  id: string;
  narrativeIds: [NarrativeId, NarrativeId];
  description: string;
  severity: Severity;
  detectedAt: string;
}

// ---------------------------------------------------------------------------
// Phase 4 — Automated Insight Discovery
// ---------------------------------------------------------------------------

export interface Insight {
  id: InsightId;
  type: 'anomaly' | 'hidden_relationship' | 'emerging_threat' | 'investigative_lead' | 'pattern';
  title: string;
  description: string;
  severity: Severity;
  confidence: Confidence;
  entityIds: EntityId[];
  evidenceIds: string[];
  source: 'intelgraph' | 'evolution_intelligence' | 'threat_intel' | 'pattern_miner';
  explanation: string;
  actionable: boolean;
  discoveredAt: string;
  acknowledgedAt?: string;
}

// ---------------------------------------------------------------------------
// Phase 5 — Mission Dashboards
// ---------------------------------------------------------------------------

export interface Mission {
  id: MissionId;
  title: string;
  objective: string;
  status: 'planning' | 'active' | 'monitoring' | 'completed' | 'archived';
  priority: Severity;
  investigationIds: InvestigationId[];
  agentIds: string[];
  threatIndicatorIds: string[];
  simulationIds: string[];
  analysts: MissionAnalyst[];
  timeline: MissionMilestone[];
  createdAt: string;
  updatedAt: string;
}

export interface MissionAnalyst {
  id: string;
  name: string;
  role: string;
  assignedAt: string;
}

export interface MissionMilestone {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed';
  dueDate?: string;
  completedAt?: string;
}

// ---------------------------------------------------------------------------
// Phase 6 — Intelligence Search
// ---------------------------------------------------------------------------

export type SearchDomain = 'all' | 'entities' | 'events' | 'investigations' | 'narratives' | 'insights' | 'reports';

export interface SearchResult {
  id: string;
  domain: SearchDomain;
  title: string;
  snippet: string;
  score: number;
  entityType?: string;
  matchedFields: string[];
  timestamp: string;
}

export interface SearchFilters {
  domain?: SearchDomain;
  entityTypes?: string[];
  timeRange?: TimeRange;
  severity?: Severity[];
  sources?: string[];
}

// ---------------------------------------------------------------------------
// Phase 7 — Command Palette
// ---------------------------------------------------------------------------

export interface IOSCommand {
  id: string;
  label: string;
  description: string;
  category: 'investigation' | 'graph' | 'simulation' | 'agent' | 'insight' | 'navigation';
  shortcut?: string;
  execute: () => void;
}

// ---------------------------------------------------------------------------
// Phase 9 — Workflow Automation
// ---------------------------------------------------------------------------

export type WorkflowTrigger = 'anomaly_detected' | 'new_entity' | 'new_event' | 'agent_result' | 'threshold_breach';

export interface WorkflowRule {
  id: string;
  name: string;
  trigger: WorkflowTrigger;
  conditions: Record<string, unknown>;
  actions: WorkflowAction[];
  enabled: boolean;
}

export interface WorkflowAction {
  type: 'generate_insight' | 'suggest_investigation' | 'update_narrative' | 'update_memory' | 'notify';
  config: Record<string, unknown>;
}
