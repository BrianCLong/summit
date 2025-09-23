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
