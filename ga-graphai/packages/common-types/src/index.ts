/**
 * Common types and helpers shared across Maestro Conductor services.
 */

// ============================================================================
// MERGE TRAIN: Preserving existing LinearX types + adding Cursor governance
// ============================================================================

export * from "./linearx";

// LinearX Automation Types
export type AutomationMode = 'auto' | 'guided' | 'manual';

export interface PromptHardening {
  readonly toxicityFilter: boolean;
  readonly jailbreakDetection: boolean;
  readonly piiRedaction: boolean;
  readonly maxPromptChars: number;
}

export interface PromptTuning {
  readonly systemInstruction: string;
  readonly styleGuide: readonly string[];
  readonly safetyClauses: readonly string[];
  readonly temperature: number;
  readonly maxTokens: number;
  readonly hardening: PromptHardening;
}

export interface NavigationDirective {
  readonly url: string;
  readonly method?: 'GET' | 'POST';
  readonly payload?: Record<string, string | number>;
  readonly headers?: Record<string, string>;
}

export interface LlmWebCommand {
  readonly entrypoint: NavigationDirective;
  readonly promptFieldSelector: string;
  readonly submitSelector: string;
  readonly completionSelector: string;
  readonly tuning: PromptTuning;
}

export interface ManualControlPlan {
  readonly mode: AutomationMode;
  readonly pauseBeforeNavigation: boolean;
  readonly pauseBeforePrompt: boolean;
  readonly pauseBeforeCapture: boolean;
}

export interface TicketDescriptor {
  readonly id: string;
  readonly summary: string;
  readonly priority: number;
  readonly requiredCapabilities: readonly string[];
  readonly entryUrl: string;
  readonly prompt: string;
  readonly llmCommand: LlmWebCommand;
  readonly automationMode: AutomationMode;
  readonly context: Record<string, string>;
}

export interface WorkerCapability {
  readonly skill: string;
  readonly weight: number;
}

export interface WorkerDescriptor {
  readonly id: string;
  readonly displayName: string;
  readonly capabilities: readonly WorkerCapability[];
  readonly maxConcurrent: number;
  readonly currentLoad: number;
}

export interface WorkParcelPlan {
  readonly ticket: TicketDescriptor;
  readonly worker: WorkerDescriptor;
  readonly manualControl: ManualControlPlan;
  readonly expectedEffortMinutes: number;
}

export interface AssignmentPlan {
  readonly parcels: readonly WorkParcelPlan[];
  readonly unassigned: readonly TicketDescriptor[];
}

export interface AutomationCommand {
  readonly parcel: WorkParcelPlan;
  readonly composedPrompt: string;
  readonly metadata: Record<string, unknown>;
}

// Policy-Aware Workcell Types
export type PolicyEffect = 'allow' | 'deny';

export type PolicyOperator = 'eq' | 'neq' | 'lt' | 'lte' | 'gt' | 'gte' | 'includes';

export interface PolicyCondition {
  attribute: string;
  operator: PolicyOperator;
  value: string | number | boolean | Array<string | number | boolean>;
}

export interface PolicyObligation {
  type: string;
  configuration?: Record<string, unknown>;
}

export interface PolicyRule {
  id: string;
  description: string;
  effect: PolicyEffect;
  actions: string[];
  resources: string[];
  conditions?: PolicyCondition[];
  obligations?: PolicyObligation[];
  tags?: string[];
}

export interface PolicyActorContext {
  tenantId: string;
  userId: string;
  roles: string[];
  region?: string;
  attributes?: Record<string, string | number | boolean>;
}

export interface PolicyEvaluationRequest {
  action: string;
  resource: string;
  context: PolicyActorContext;
}

export interface PolicyEvaluationTrace {
  ruleId: string;
  matched: boolean;
  reasons: string[];
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  effect: PolicyEffect;
  matchedRules: string[];
  reasons: string[];
  obligations: PolicyObligation[];
  trace: PolicyEvaluationTrace[];
}

export interface LedgerFactInput {
  id: string;
  category: string;
  actor: string;
  action: string;
  resource: string;
  payload: Record<string, unknown>;
  timestamp?: string;
}

export interface LedgerEntry extends LedgerFactInput {
  hash: string;
  previousHash?: string;
  timestamp: string;
}

export interface EvidenceBundle {
  generatedAt: string;
  headHash?: string;
  entries: LedgerEntry[];
}

export type WorkTaskStatus = 'success' | 'rejected' | 'failed';

export interface WorkTaskInput {
  taskId: string;
  tool: string;
  action: string;
  resource: string;
  payload: Record<string, unknown>;
  requiredAuthority?: number;
}

export interface WorkTaskResult {
  taskId: string;
  status: WorkTaskStatus;
  logs: string[];
  output: Record<string, unknown>;
}

export interface WorkOrderSubmission {
  orderId: string;
  submittedBy: string;
  tenantId: string;
  userId: string;
  agentName: string;
  roles: string[];
  region?: string;
  attributes?: Record<string, string | number | boolean>;
  tasks: WorkTaskInput[];
  metadata?: Record<string, unknown>;
}

export type WorkOrderStatus = 'completed' | 'partial' | 'rejected';

export interface WorkOrderResult {
  orderId: string;
  submittedBy: string;
  agentName: string;
  tenantId: string;
  status: WorkOrderStatus;
  startedAt: string;
  finishedAt: string;
  tasks: WorkTaskResult[];
  obligations: PolicyObligation[];
  reasons: string[];
}

export interface WorkcellToolHandlerContext {
  orderId: string;
  taskId: string;
  tenantId: string;
  userId: string;
  agentName: string;
  metadata?: Record<string, unknown>;
}

export type WorkcellToolHandler = (
  task: WorkTaskInput,
  context: WorkcellToolHandlerContext
) => Promise<Record<string, unknown>> | Record<string, unknown>;

export interface WorkcellToolDefinition {
  name: string;
  minimumAuthority?: number;
  handler: WorkcellToolHandler;
}

export interface WorkcellAgentDefinition {
  name: string;
  authority: number;
  allowedTools: string[];
  roles: string[];
}

// Zero Spend Routing Types
export interface CostEstimate {
  unit: string; // billing unit (e.g. `usd/1kTok`)
  estimate: number; // expected unit cost
}

export interface LatencyDistribution {
  p50: number;
  p95: number;
}

export interface CandidateResource {
  id: string;
  kind: "model" | "runtime" | "hardware";
  skills: string[];
  ckpt: string;
  contextTokens: number;
  cost: CostEstimate;
  latencyMs: LatencyDistribution;
  safetyTier: "A" | "B" | "C";
  licenseClass: string;
  residency: string;
  constraints?: { pii?: boolean };
}

export interface DecisionRecord {
  taskId: string;
  arms: { id: string; V: number }[];
  chosen: string;
  pred: { quality: number; lat: number; cost: number };
  actual: { quality: number; lat: number; cost: number };
  provenanceUri: string;
  budgetDeltaUSD: number;
}

export const RESOURCE_KINDS = {
  MODEL: "model",
  RUNTIME: "runtime",
  HARDWARE: "hardware"
} as const;

export const SAFETY_TIERS = { A: "A", B: "B", C: "C" } as const;

export const LICENSE_CLASSES = {
  MIT_OK: "MIT-OK",
  OPEN_DATA_OK: "Open-Data-OK",
  RESTRICTED_TOS: "Restricted-TOS"
} as const;

export const ZERO_SPEND_OPTIMIZATIONS = {
  KV_CACHE: "kvCache",
  MEMOIZATION: "memo",
  QUANTIZATION: "quant",
  SPECULATIVE_DECODE: "specDecode",
  BATCHING: "batching",
  VLLM: "vLLM",
  LORA: "LoRA"
} as const;

export interface BudgetSnapshot {
  baselineMonthlyUSD: number;
  consumedUSD: number;
  headroomPct: number;
  burnRateUSDPerDay: number;
  forecastUSD: number;
}

export interface ValueDensityMetrics {
  quality: number;
  coverage: number;
  cost: number;
  latency: number;
}

// ============================================================================
// CURSOR GOVERNANCE TYPES - Added from PR 1299
// ============================================================================

export type CursorEventName =
  | "cursor.session.start"
  | "cursor.session.stop"
  | "cursor.prompt"
  | "cursor.applyDiff"
  | "cursor.commit";

export type CursorPurpose =
  | "investigation"
  | "threat-intel"
  | "fraud-risk"
  | "t&s"
  | "benchmarking"
  | "training"
  | "demo"
  | (string & {});

export type CursorDataClass =
  | "public-code"
  | "pseudo-data"
  | "production-PII"
  | "secrets"
  | "proprietary-client"
  | "legal-hold"
  | (string & {});

export interface CursorActor {
  id: string;
  email?: string;
  displayName?: string;
  scopes?: string[];
  deviceBindingId?: string;
}

export interface CursorModel {
  name: string;
  vendor: string;
  routing?: "proxy" | "direct" | (string & {});
  version?: string;
}

export interface CursorInputReference {
  promptSha256?: string;
  contextRefs?: string[];
  summary?: string;
}

export interface CursorOutputReference {
  diffSha256?: string;
  linesAdded?: number;
  linesModified?: number;
  artifactSha256?: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd?: number;
  currency?: string;
}

export interface PolicyDecision {
  decision: "allow" | "deny";
  explanations: string[];
  ruleIds?: string[];
  obligations?: string[];
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface PolicyEvaluationContext {
  repoMeta?: {
    license?: string;
    visibility?: "public" | "private" | "internal" | (string & {});
    tags?: string[];
  };
  scan?: {
    piiFound?: boolean;
    secretsFound?: boolean;
    licenseFindings?: string[];
    redactionsApplied?: boolean;
  };
  purpose?: CursorPurpose;
  dataClasses?: CursorDataClass[];
  model?: CursorModel;
  story?: {
    id?: string;
    type?: string;
    url?: string;
  };
}

export interface CursorEvent {
  tenantId: string;
  repo: string;
  branch: string;
  event: CursorEventName;
  actor: CursorActor;
  ts: string;
  model?: CursorModel;
  inputRef?: CursorInputReference;
  outputRef?: CursorOutputReference;
  purpose: CursorPurpose;
  policy?: PolicyDecision;
  provenance: {
    sessionId: string;
    requestId: string;
    parentRequestId?: string;
  };
  usage?: TokenUsage;
  storyRef?: {
    id?: string;
    key?: string;
    url?: string;
  };
  dataClasses?: CursorDataClass[];
  workspaceRulesVersion?: string;
  tags?: string[];
}

export interface ProvenanceRecord extends CursorEvent {
  policy: PolicyDecision;
  receivedAt: string;
  checksum: string;
  budget?: BudgetResult;
  rateLimit?: RateLimitResult;
}

export interface BudgetConfig {
  tokens: number;
  currency?: number;
  windowMs: number;
  alertPercent?: number;
}

export interface BudgetState {
  windowStartedAt: number;
  tokensConsumed: number;
  currencyConsumed: number;
  lastEventAt?: number;
}

export interface BudgetResult {
  allowed: boolean;
  reason?: string;
  remainingTokens: number;
  remainingCurrency?: number;
  alertTriggered: boolean;
  budget: BudgetConfig | null;
  state: BudgetState;
}

export interface RateLimitConfig {
  capacity: number;
  refillPerSecond: number;
  keyFactory?: (event: CursorEvent) => string;
}

export interface RateLimitState {
  tokens: number;
  updatedAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  state: RateLimitState;
  config: RateLimitConfig;
}

export interface GatewayAuthContext {
  tenantId: string;
  actor: CursorActor;
  deviceId?: string;
  scopes: string[];
  tokenExpiresAt: string;
  mTLSFingerprint?: string;
  purpose?: CursorPurpose;
  storyRef?: {
    id?: string;
    key?: string;
    url?: string;
  };
  attributes?: Record<string, unknown>;
  dataClasses?: CursorDataClass[];
  repoMeta?: PolicyEvaluationContext["repoMeta"];
  scan?: PolicyEvaluationContext["scan"];
  model?: CursorModel;
  requestIp?: string;
  requestId?: string;
}

export interface CursorGatewayRequest {
  event: CursorEvent;
  auth: GatewayAuthContext;
  now?: Date;
}

export interface GatewayResponse {
  decision: PolicyDecision;
  budget: BudgetResult;
  rateLimit: RateLimitResult;
  record: ProvenanceRecord;
}

export interface CursorEventPayloadActor {
  id: string;
  email?: string;
  display_name?: string;
}

export interface CursorEventPayloadModel {
  name: string;
  vendor: string;
  routing?: string;
  version?: string;
}

export interface CursorEventPayload {
  tenant_id: string;
  repo: string;
  branch: string;
  actor: CursorEventPayloadActor;
  event: CursorEventName;
  ts: string;
  model?: CursorEventPayloadModel;
  input_ref?: {
    prompt_sha256?: string;
    context_refs?: string[];
    summary?: string;
  };
  output_ref?: {
    diff_sha256?: string;
    lines_added?: number;
    lines_modified?: number;
    artifact_sha256?: string;
  };
  purpose: CursorPurpose;
  policy?: PolicyDecision;
  provenance: {
    session_id: string;
    request_id: string;
    parent_request_id?: string;
  };
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    cost_usd?: number;
    currency?: string;
  };
  story_ref?: {
    id?: string;
    key?: string;
    url?: string;
  };
  data_classes?: CursorDataClass[];
  workspace_rules_version?: string;
  tags?: string[];
}

const EMPTY_USAGE: TokenUsage = {
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
};

function normalizeUsage(usage?: CursorEventPayload["usage"]): TokenUsage {
  if (!usage) {
    return EMPTY_USAGE;
  }

  const promptTokens = usage.prompt_tokens ?? 0;
  const completionTokens = usage.completion_tokens ?? 0;
  const totalTokens = usage.total_tokens ?? promptTokens + completionTokens;

  return {
    promptTokens,
    completionTokens,
    totalTokens,
    costUsd: usage.cost_usd,
    currency: usage.currency,
  };
}

export function normalizeCursorEvent(payload: CursorEventPayload): CursorEvent {
  return {
    tenantId: payload.tenant_id,
    repo: payload.repo,
    branch: payload.branch,
    actor: {
      id: payload.actor.id,
      email: payload.actor.email,
      displayName: payload.actor.display_name,
    },
    event: payload.event,
    ts: payload.ts,
    model: payload.model
      ? {
          name: payload.model.name,
          vendor: payload.model.vendor,
          routing: payload.model.routing,
          version: payload.model.version,
        }
      : undefined,
    inputRef: payload.input_ref
      ? {
          promptSha256: payload.input_ref.prompt_sha256,
          contextRefs: payload.input_ref.context_refs,
          summary: payload.input_ref.summary,
        }
      : undefined,
    outputRef: payload.output_ref
      ? {
          diffSha256: payload.output_ref.diff_sha256,
          linesAdded: payload.output_ref.lines_added,
          linesModified: payload.output_ref.lines_modified,
          artifactSha256: payload.output_ref.artifact_sha256,
        }
      : undefined,
    purpose: payload.purpose,
    policy: payload.policy,
    provenance: {
      sessionId: payload.provenance.session_id,
      requestId: payload.provenance.request_id,
      parentRequestId: payload.provenance.parent_request_id,
    },
    usage: normalizeUsage(payload.usage),
    storyRef: payload.story_ref,
    dataClasses: payload.data_classes,
    workspaceRulesVersion: payload.workspace_rules_version,
    tags: payload.tags,
  };
}

export function mergeDataClasses(
  event: CursorEvent,
  context?: PolicyEvaluationContext
): CursorDataClass[] {
  const classes = new Set<CursorDataClass>();

  for (const value of event.dataClasses ?? []) {
    classes.add(value);
  }

  for (const value of context?.dataClasses ?? []) {
    classes.add(value);
  }

  return Array.from(classes);
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const TENANT_BUDGETS: Record<string, BudgetConfig> = {
  test: {
    tokens: 3_000_000,
    currency: 25,
    windowMs: DAY_MS,
    alertPercent: 0.8,
  },
  demo: {
    tokens: 3_000_000,
    currency: 25,
    windowMs: DAY_MS,
    alertPercent: 0.8,
  },
  "maestro-internal": {
    tokens: 3_000_000,
    currency: 25,
    windowMs: DAY_MS,
    alertPercent: 0.8,
  },
  "production-sample": {
    tokens: 12_000_000,
    currency: 100,
    windowMs: DAY_MS,
    alertPercent: 0.85,
  },
};

export const MODEL_ALLOWLIST = [
  "gpt-4.1-mini",
  "claude-3.5-sonnet",
] as const;

export const PURPOSE_ALLOWLIST: CursorPurpose[] = [
  "investigation",
  "threat-intel",
  "fraud-risk",
  "t&s",
  "benchmarking",
  "training",
  "demo",
];

// ============================================================================
// MAESTRO CONDUCTOR WORKFLOW TYPES - Added from PR 1313
// ============================================================================

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