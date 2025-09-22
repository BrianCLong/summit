/**
 * Common types and helpers shared across Maestro Conductor services.
 */

export const NODE_CATEGORIES = {
  source: ["git.clone", "s3.fetch", "artifact.import"] as const,
  build: ["build.compile", "build.cache"] as const,
  test: ["test.junit", "test.pytest", "test.map", "test.reduce"] as const,
  quality: ["quality.lint", "quality.coverage"] as const,
  security: ["security.sca", "security.sast", "security.dast"] as const,
  package: ["package.docker", "package.helm"] as const,
  deploy: ["deploy.canary", "deploy.rollback", "deploy.promotion"] as const,
  utility: [
    "util.fanout",
    "util.fanin",
    "util.gate",
    "util.approval",
    "util.map",
    "util.reduce"
  ] as const,
  ai: ["ai.summarize", "ai.release-notes"] as const
} as const;

export type NodeCategory = keyof typeof NODE_CATEGORIES;
export type NodeType = (typeof NODE_CATEGORIES)[NodeCategory][number];
export type EdgeCondition = "success" | "failure" | "always" | "manual";
export type ArtifactType =
  | "sarif"
  | "spdx"
  | "junit"
  | "coverage"
  | "provenance"
  | "generic";
export type EvidenceType = ArtifactType | "trace" | "log" | "screenshot";
export type RetentionTier = "short-30d" | "standard-365d" | "extended-730d";

export interface ArtifactBinding {
  name: string;
  type: ArtifactType;
  optional?: boolean;
  description?: string;
}

export interface EvidenceOutput {
  type: EvidenceType;
  path: string;
  required?: boolean;
  description?: string;
}

export interface SecretRef {
  /**
   * Vault reference (`vault://path/to/secret`). Literal secrets are forbidden.
   */
  vault: string;
  key: string;
  version?: string;
}

export interface NodeEstimates {
  latencyP95Ms?: number;
  costUSD?: number;
  queueMs?: number;
  memoryMb?: number;
  cpuMillis?: number;
  tokens?: number;
  successRate?: number;
  cacheable?: boolean;
}

export interface NodePolicy {
  requiresApproval?: boolean;
  requiresShortRetention?: boolean;
  licenseClass?: string;
  handlesPii?: boolean;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  name?: string;
  description?: string;
  params: Record<string, unknown>;
  retries?: number;
  timeoutMs?: number;
  budgetUSD?: number;
  parallelism?: number;
  pool?: string;
  estimates?: NodeEstimates;
  policy?: NodePolicy;
  consumes?: ArtifactBinding[];
  produces?: ArtifactBinding[];
  evidenceOutputs?: EvidenceOutput[];
  aiAssist?: {
    enabled: boolean;
    mode: "suggest" | "explain" | "optimize";
  };
  workbook?: {
    uri: string;
    checksum?: string;
  };
}

export interface WorkflowEdge {
  from: string;
  to: string;
  on: EdgeCondition;
  condition?: string;
  dataRefs?: string[];
}

export interface WorkflowPolicy {
  purpose: string;
  retention: RetentionTier;
  licenseClass: string;
  pii: boolean;
}

export interface WorkflowConstraints {
  latencyP95Ms: number;
  budgetUSD: number;
  errorBudgetPercent?: number;
  maxParallelism?: number;
}

export interface WorkflowMetadata {
  workflowId: string;
  name: string;
  version: number;
  tenantId: string;
  tags?: string[];
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
  description?: string;
}

export interface WorkflowDefinition extends WorkflowMetadata {
  policy: WorkflowPolicy;
  constraints: WorkflowConstraints;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  defaults?: {
    retries?: number;
    timeoutMs?: number;
    budgetUSD?: number;
    evidenceRequired?: boolean;
  };
  templates?: WorkflowTemplateRef[];
}

export interface WorkflowTemplateRef {
  templateId: string;
  version: number;
  description?: string;
  parameters?: TemplateParameter[];
}

export interface TemplateParameter {
  name: string;
  description?: string;
  required: boolean;
  defaultValue?: unknown;
  type?: "string" | "number" | "boolean" | "object" | "array";
  secret?: boolean;
}

export type RunStatus = "pending" | "running" | "succeeded" | "failed" | "aborted";
export type NodeRunStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "skipped";

export interface RunNodeSnapshot {
  nodeId: string;
  status: NodeRunStatus;
  startedAt?: string;
  finishedAt?: string;
  metrics?: Record<string, number>;
  logsUri?: string;
  artifacts?: Record<string, string>;
  spanId?: string;
}

export interface WorkflowRunStats {
  latencyMs: number;
  costUSD: number;
  criticalPath: string[];
  cacheHits?: number;
  retries?: number;
}

export interface WorkflowRunRecord {
  runId: string;
  workflowId: string;
  version: number;
  status: RunStatus;
  tenantId?: string;
  startedAt?: string;
  finishedAt?: string;
  stats: WorkflowRunStats;
  policy?: WorkflowPolicy;
  nodes?: RunNodeSnapshot[];
  provenance?: {
    ledgerUri: string;
  };
  annotations?: Record<string, string>;
}

export interface LedgerContext {
  ledgerBaseUri: string;
  signer: string;
  signingKey: string;
  timestamp?: string;
}

export interface LedgerEvidencePointer {
  nodeId: string;
  path: string;
  type: EvidenceType;
}

export interface LedgerRecord {
  runId: string;
  workflowId: string;
  version: number;
  tenantId?: string;
  status: RunStatus;
  policy: WorkflowPolicy;
  stats: WorkflowRunStats;
  evidence: LedgerEvidencePointer[];
  inputsHash: string;
  outputsHash: string;
  signature: string;
  ledgerUri: string;
  timestamp: string;
  tags?: string[];
}

export interface WorkflowValidationIssue {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  nodes?: string[];
  edge?: WorkflowEdge;
  suggestion?: string;
}

export interface WorkflowSuggestion {
  code: string;
  title: string;
  detail: string;
  appliesTo?: string[];
  estimatedGain?: {
    latencyMs?: number;
    costUSD?: number;
  };
}

export interface WorkflowEstimates {
  latencyP95Ms: number;
  costUSD: number;
  queueMs: number;
  successRate: number;
  criticalPath: string[];
}

export interface ObserverTimelineFrame {
  index: number;
  timestamp: string;
  nodeStatuses: Record<string, NodeRunStatus>;
  costUSD?: number;
  latencyMs?: number;
  criticalPath?: string[];
}

export interface ObserverTimeline {
  frames: ObserverTimelineFrame[];
}

export interface EvidenceAnalysis {
  missing: string[];
  optional: string[];
  complete: string[];
}

export interface WorkflowStaticAnalysis {
  issues: WorkflowValidationIssue[];
  suggestions: WorkflowSuggestion[];
  sources: string[];
  sinks: string[];
  unreachable: string[];
  estimated: WorkflowEstimates;
  evidence: EvidenceAnalysis;
}

export interface ValidationDefaults {
  retries: number;
  timeoutMs: number;
  budgetUSD: number;
  evidenceRequired: boolean;
}

export interface WorkflowValidationResult {
  normalized: WorkflowDefinition;
  analysis: WorkflowStaticAnalysis;
}

export interface PolicyInput {
  workflow: WorkflowDefinition;
  topology: {
    edges: WorkflowEdge[];
  };
  evidence: EvidenceAnalysis;
  constraints: WorkflowConstraints;
}

export interface WhatIfScenario {
  label: string;
  parallelismMultiplier?: number;
  cacheHitRate?: number;
  overrides?: Record<string, Partial<NodeEstimates>>;
}

export const DEFAULT_VALIDATION_DEFAULTS: ValidationDefaults = {
  retries: 1,
  timeoutMs: 15 * 60 * 1000,
  budgetUSD: 5,
  evidenceRequired: true
};

export const SHORT_RETENTION: RetentionTier = "short-30d";
export const DEFAULT_RETENTION: RetentionTier = "standard-365d";

export function emptyWorkflow(
  tenantId: string,
  name: string,
  createdBy?: string
): WorkflowDefinition {
  return normalizeWorkflow({
    workflowId: "",
    name,
    version: 1,
    tenantId,
    policy: {
      purpose: "engineering",
      retention: DEFAULT_RETENTION,
      licenseClass: "MIT-OK",
      pii: false
    },
    constraints: {
      latencyP95Ms: 30 * 60 * 1000,
      budgetUSD: 25,
      errorBudgetPercent: 0.1,
      maxParallelism: 32
    },
    nodes: [],
    edges: [],
    createdBy,
    createdAt: createdBy ? new Date().toISOString() : undefined
  });
}

export function normalizeWorkflow(
  workflow: WorkflowDefinition,
  defaults: Partial<ValidationDefaults> = {}
): WorkflowDefinition {
  const mergedDefaults: ValidationDefaults = {
    ...DEFAULT_VALIDATION_DEFAULTS,
    ...workflow.defaults,
    ...defaults
  };

  const nodes = workflow.nodes.map((node) => applyNodeDefaults(node, mergedDefaults));
  return {
    ...workflow,
    defaults: mergedDefaults,
    nodes
  };
}

function applyNodeDefaults(
  node: WorkflowNode,
  defaults: ValidationDefaults
): WorkflowNode {
  return {
    ...node,
    retries: node.retries ?? defaults.retries,
    timeoutMs: node.timeoutMs ?? defaults.timeoutMs,
    budgetUSD: node.budgetUSD ?? defaults.budgetUSD,
    evidenceOutputs:
      node.evidenceOutputs && node.evidenceOutputs.length > 0
        ? node.evidenceOutputs
        : defaults.evidenceRequired
        ? [
            {
              type: "provenance",
              path: `prov/${node.id}.json`,
              required: true
            }
          ]
        : []
  };
}

export function derivePolicyInput(workflow: WorkflowDefinition): PolicyInput {
  const normalized = normalizeWorkflow(workflow);
  const evidence = analyzeEvidence(normalized.nodes);
  return {
    workflow: normalized,
    topology: { edges: normalized.edges },
    evidence,
    constraints: normalized.constraints
  };
}

export function analyzeEvidence(nodes: WorkflowNode[]): EvidenceAnalysis {
  const missing: string[] = [];
  const optional: string[] = [];
  const complete: string[] = [];
  for (const node of nodes) {
    const outputs = node.evidenceOutputs ?? [];
    if (!outputs.length) {
      missing.push(node.id);
      continue;
    }
    const requiredOutputs = outputs.filter((item) => item.required !== false);
    if (!requiredOutputs.length) {
      optional.push(node.id);
    } else {
      complete.push(node.id);
    }
  }
  return { missing, optional, complete };
}

export function listSourceNodes(workflow: WorkflowDefinition): string[] {
  const targets = new Set(workflow.edges.map((edge) => edge.to));
  return workflow.nodes
    .filter((node) => !targets.has(node.id))
    .map((node) => node.id);
}

export function listSinkNodes(workflow: WorkflowDefinition): string[] {
  const outgoing = new Set(workflow.edges.map((edge) => edge.from));
  return workflow.nodes
    .filter((node) => !outgoing.has(node.id))
    .map((node) => node.id);
}

export function listOrphanNodes(workflow: WorkflowDefinition): string[] {
  const sources = new Set(listSourceNodes(workflow));
  const sinks = new Set(listSinkNodes(workflow));
  return workflow.nodes
    .filter((node) => !sources.has(node.id) && !sinks.has(node.id))
    .map((node) => node.id);
}

export function summarizeWorkflow(workflow: WorkflowDefinition): {
  nodeCount: number;
  edgeCount: number;
  pools: Set<string>;
} {
  const pools = new Set<string>();
  for (const node of workflow.nodes) {
    if (node.pool) {
      pools.add(node.pool);
    }
  }
  return { nodeCount: workflow.nodes.length, edgeCount: workflow.edges.length, pools };
}

export function createWhatIfScenario(
  label: string,
  overrides: WhatIfScenario["overrides"]
): WhatIfScenario {
  return {
    label,
    overrides
  };
}

export function enumerateArtifacts(nodes: WorkflowNode[]): ArtifactBinding[] {
  const collected: ArtifactBinding[] = [];
  for (const node of nodes) {
    if (node.produces) {
      collected.push(...node.produces);
    }
  }
  return collected;
}

export function buildLedgerUri(context: LedgerContext, runId: string): string {
  const base = context.ledgerBaseUri.replace(/\/$/, "");
  return `${base}/${runId}`;
}

export function collectEvidencePointers(nodes: WorkflowNode[]): LedgerEvidencePointer[] {
  const pointers: LedgerEvidencePointer[] = [];
  for (const node of nodes) {
    for (const evidence of node.evidenceOutputs ?? []) {
      pointers.push({ nodeId: node.id, path: evidence.path, type: evidence.type });
    }
  }
  return pointers;
}

export function ensureSecret(value: unknown): value is SecretRef {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as SecretRef;
  return typeof candidate.vault === "string" && typeof candidate.key === "string";
}
