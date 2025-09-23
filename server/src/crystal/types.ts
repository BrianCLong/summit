export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

export enum PanelType {
  AGENT = 'AGENT',
  TERMINAL = 'TERMINAL',
  DIFF = 'DIFF',
  EDITOR = 'EDITOR',
  LOGS = 'LOGS',
  TOOLS = 'TOOLS',
}

export enum AttachmentType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  FILE = 'FILE',
}

export interface PanelLayout {
  x: number;
  y: number;
  w: number;
  h: number;
  preset?: string;
}

export interface CrystalPanel {
  id: string;
  type: PanelType;
  name: string;
  layout: PanelLayout;
  state?: JSONValue;
}

export interface AttachmentMetadata {
  id: string;
  type: AttachmentType;
  name: string;
  size: number;
  contentType: string;
  purpose: string;
  retention: 'short-30d' | 'standard-365d' | 'legal-hold';
  uri?: string;
  createdAt: string;
}

export interface WorktreeMetadata {
  id: string;
  branch: string;
  repoPath: string;
  worktreePath: string;
  status: 'pending' | 'ready' | 'rebase' | 'deleting';
  createdAt: string;
  updatedAt: string;
  lastRebasedAt?: string;
  lastSquashedAt?: string;
}

export interface RunScriptDefinition {
  id: string;
  name: string;
  command: string;
  timeoutMs?: number;
  environment?: Record<string, string>;
}

export interface RunLogEntry {
  id: string;
  timestamp: string;
  stream: 'stdout' | 'stderr' | 'system';
  message: string;
}

export interface RichOutputPayload {
  kind: 'markdown' | 'table' | 'diagram' | 'test-report';
  title?: string;
  data: JSONValue;
}

export interface AssistantMessage {
  id: string;
  agentId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  richOutput?: RichOutputPayload;
  attachmentIds?: string[];
}

export interface RunExecution {
  id: string;
  definitionId: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  startedAt: string;
  completedAt?: string;
  exitCode?: number;
  provenanceId: string;
  logs: RunLogEntry[];
}

export interface AgentRegistration {
  id: string;
  adapterKey: string;
  status: 'idle' | 'busy' | 'error';
  capabilities: string[];
  createdAt: string;
}

export interface SLOSnapshot {
  gatewayReadP95: number;
  gatewayReadP99: number;
  gatewayWriteP95: number;
  gatewayWriteP99: number;
  subscriptionP95: number;
  graphHopP95: number;
  graphHopP99: number;
}

export interface BudgetSnapshot {
  environment: 'dev' | 'staging' | 'prod' | 'llm';
  monthlyLimitUsd: number;
  monthlySpendUsd: number;
  alertThresholdHit: boolean;
}

export interface CostSnapshot {
  budgets: BudgetSnapshot[];
}

export interface CrystalSession {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'closing' | 'closed';
  theme: 'light' | 'dark';
  createdAt: string;
  updatedAt: string;
  purposeTags: string[];
  retention: 'short-30d' | 'standard-365d' | 'legal-hold';
  worktree: WorktreeMetadata;
  panels: CrystalPanel[];
  attachments: AttachmentMetadata[];
  runScripts: RunScriptDefinition[];
  runs: RunExecution[];
  agents: AgentRegistration[];
  messages: AssistantMessage[];
  provenanceId: string;
  slo: SLOSnapshot;
  cost: CostSnapshot;
}

export interface CreateSessionInput {
  name: string;
  description?: string;
  projectPath: string;
  mainBranch?: string;
  theme?: 'light' | 'dark';
  purposeTags?: string[];
  retention?: 'short-30d' | 'standard-365d' | 'legal-hold';
  runScripts?: Array<{
    name: string;
    command: string;
    timeoutMs?: number;
    environment?: Record<string, string>;
  }>;
  attachments?: Array<{
    type: AttachmentType;
    name: string;
    size: number;
    contentType: string;
    purpose: string;
    retention?: 'short-30d' | 'standard-365d' | 'legal-hold';
    uri?: string;
  }>;
  adapters?: string[];
  panelPresets?: Array<{
    type: PanelType;
    name?: string;
    preset?: string;
  }>;
}

export interface StartRunInput {
  sessionId: string;
  runDefinitionId: string;
  overrides?: {
    command?: string;
    timeoutMs?: number;
    environment?: Record<string, string>;
  };
}

export interface RecordMessageInput {
  sessionId: string;
  agentId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachmentIds?: string[];
  richOutput?: RichOutputPayload;
}

export interface UpdatePanelsInput {
  sessionId: string;
  panels: Array<{
    panelId: string;
    layout: PanelLayout;
  }>;
}

export interface CloseSessionInput {
  sessionId: string;
}

export interface ProvenanceEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: JSONValue;
}

export type JSONRecord = Record<string, JSONValue>;
