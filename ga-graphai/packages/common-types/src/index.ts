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

export type PolicyOperator =
  | 'eq'
  | 'neq'
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte'
  | 'includes';

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
