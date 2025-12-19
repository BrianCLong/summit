export interface GraphNode {
  label: string;
  properties: string[];
  synonyms?: string[];
}

export interface GraphRelationship {
  type: string;
  from: string;
  to: string;
  direction?: 'out' | 'in';
  properties?: string[];
  synonyms?: string[];
}

export interface GraphSchema {
  nodes: GraphNode[];
  relationships: GraphRelationship[];
}

export interface CostEstimate {
  anticipatedRows: number;
  estimatedLatencyMs: number;
  estimatedRru: number;
}

export interface CypherPlanEstimate {
  rows: number;
  depth: number;
  costScore: number;
  containsWrite?: boolean;
}

export interface NLToCypherOptions {
  schema: GraphSchema;
  limit?: number;
  defaultRelationship?: string;
}

export interface NLToCypherResult {
  cypher: string;
  costEstimate: CostEstimate;
  reasoning: string[];
  citations: string[];
  warnings: string[];
}

export interface NLQuerySandboxInput {
  prompt: string;
  schema: GraphSchema;
  caseScope: { caseId: string };
  approvedExecution?: boolean;
  maxDepth?: number;
  sandboxMode?: boolean;
  tenantId?: string;
  policy?: PolicyContext;
  featureFlags?: Record<string, boolean | string>;
  traceId?: string;
  requestId?: string;
  userId?: string;
}

export interface NLQuerySandboxResponse {
  cypher: string;
  params: Record<string, unknown>;
  estimate: CypherPlanEstimate;
  warnings: string[];
  allowExecute: boolean;
  requestId: string;
  sandboxPreview?: SandboxResult;
}

export interface PolicyContext {
  authorityId: string;
  purpose: string;
  classification?: string;
}

export interface SandboxDatasetNode {
  id: string;
  label: string;
  properties: Record<string, unknown>;
}

export interface SandboxDatasetRelationship {
  id: string;
  type: string;
  from: string;
  to: string;
  properties?: Record<string, unknown>;
}

export interface SandboxDataset {
  nodes: SandboxDatasetNode[];
  relationships: SandboxDatasetRelationship[];
}

export interface SandboxExecuteInput {
  cypher: string;
  tenantId: string;
  policy: PolicyContext;
  dataset?: SandboxDataset;
  timeoutMs?: number;
  approvedExecution?: boolean;
  featureFlags?: Record<string, boolean | string>;
  traceId?: string;
  requestId?: string;
  userId?: string;
  environment?: string;
}

export interface SandboxRow {
  columns: string[];
  values: Record<string, unknown>;
}

export interface SandboxResult {
  rows: SandboxRow[];
  columns: string[];
  latencyMs: number;
  truncated: boolean;
  plan: string[];
  policyWarnings: string[];
  monitoring?: QueryMonitoringResult;
}

export interface QueryPlan {
  targetLabel: string;
  estimatedRows: number;
  depth: number;
  containsAggregation: boolean;
}

export type { QueryMonitoringResult } from './queryMonitor.js';

export type UndoRedoCommand<TState> = {
  description: string;
  apply: (state: TState) => TState;
  revert: (state: TState) => TState;
};
