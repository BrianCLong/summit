/**
 * Summit War Room — Core Types
 *
 * Type definitions for the War Room operational interface.
 */

/* ------------------------------------------------------------------ */
/*  Panel System                                                       */
/* ------------------------------------------------------------------ */

export type PanelId =
  | 'graph'
  | 'timeline'
  | 'entity-inspector'
  | 'evidence'
  | 'query-console'
  | 'agent-console'
  | 'simulation'
  | 'activity-feed'
  | 'investigation-notes'
  | 'narrative-builder';

export interface PanelDescriptor {
  id: PanelId;
  title: string;
  icon: string;           // MUI icon name
  minWidth: number;
  minHeight: number;
  defaultWidth: number;
  defaultHeight: number;
}

export interface PanelState {
  id: PanelId;
  visible: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WorkspaceLayout {
  id: string;
  name: string;
  panels: PanelState[];
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/*  Investigation                                                      */
/* ------------------------------------------------------------------ */

export type InvestigationStatus = 'draft' | 'active' | 'review' | 'closed' | 'archived';
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type ConfidenceLevel = 'confirmed' | 'probable' | 'possible' | 'doubtful';

export interface Investigation {
  id: string;
  title: string;
  description: string;
  status: InvestigationStatus;
  priority: Priority;
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  entities: string[];       // entity IDs
  evidenceIds: string[];
  hypotheses: Hypothesis[];
  timelineEvents: TimelineEvent[];
}

export interface Hypothesis {
  id: string;
  text: string;
  confidence: ConfidenceLevel;
  supportingEvidence: string[];
  contradictingEvidence: string[];
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Graph / Entity                                                     */
/* ------------------------------------------------------------------ */

export interface GraphEntity {
  id: string;
  type: string;             // person | org | location | event | asset | document
  label: string;
  properties: Record<string, unknown>;
  confidence: ConfidenceLevel;
  sources: string[];
}

export interface GraphRelationship {
  id: string;
  source: string;
  target: string;
  type: string;
  properties: Record<string, unknown>;
  confidence: ConfidenceLevel;
  weight: number;
}

export interface GraphQuery {
  id: string;
  cypher: string;
  label: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Timeline                                                           */
/* ------------------------------------------------------------------ */

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  endTimestamp?: string;
  source: string;
  entityIds: string[];
  confidence: ConfidenceLevel;
  tags: string[];
  isAnomaly?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Evidence / Provenance                                              */
/* ------------------------------------------------------------------ */

export type SourceReliability = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface EvidenceItem {
  id: string;
  title: string;
  type: 'document' | 'image' | 'signal' | 'osint' | 'humint' | 'testimony' | 'artifact';
  content: string;
  sourceId: string;
  reliability: SourceReliability;
  classification: string;
  linkedEntities: string[];
  provenance: ProvenanceRecord[];
  createdAt: string;
}

export interface ProvenanceRecord {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  details: string;
  parentId?: string;
}

export interface Source {
  id: string;
  name: string;
  type: string;
  reliability: SourceReliability;
  url?: string;
  lastAccessed?: string;
}

/* ------------------------------------------------------------------ */
/*  Agents                                                             */
/* ------------------------------------------------------------------ */

export type AgentStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed';

export interface AgentTask {
  id: string;
  agentId: string;
  agentName: string;
  type: string;
  status: AgentStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  reasoning: ReasoningStep[];
  startedAt: string;
  completedAt?: string;
  progress: number;         // 0-100
}

export interface ReasoningStep {
  id: string;
  step: number;
  thought: string;
  action: string;
  observation: string;
  timestamp: string;
}

/* ------------------------------------------------------------------ */
/*  Simulation                                                         */
/* ------------------------------------------------------------------ */

export type SimulationStatus = 'draft' | 'running' | 'paused' | 'completed';

export interface Simulation {
  id: string;
  title: string;
  description: string;
  status: SimulationStatus;
  scenarioTree: ScenarioNode;
  createdAt: string;
  updatedAt: string;
}

export interface ScenarioNode {
  id: string;
  title: string;
  description: string;
  probability: number;
  impact: number;
  children: ScenarioNode[];
  outcomes: SimulationOutcome[];
}

export interface SimulationOutcome {
  id: string;
  label: string;
  metrics: Record<string, number>;
  narrative: string;
}

/* ------------------------------------------------------------------ */
/*  Collaboration                                                      */
/* ------------------------------------------------------------------ */

export interface Collaborator {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  color: string;
  cursor?: { x: number; y: number; panel: PanelId };
  lastSeen: string;
}

export interface Annotation {
  id: string;
  authorId: string;
  targetId: string;
  targetType: 'entity' | 'evidence' | 'event' | 'relationship';
  text: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  authorId: string;
  text: string;
  parentId?: string;
  createdAt: string;
  resolved: boolean;
}

/* ------------------------------------------------------------------ */
/*  Command Palette                                                    */
/* ------------------------------------------------------------------ */

export interface CommandItem {
  id: string;
  label: string;
  category: 'entity' | 'query' | 'agent' | 'investigation' | 'simulation' | 'navigation';
  shortcut?: string;
  action: () => void;
}
