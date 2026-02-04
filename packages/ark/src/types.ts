import { z } from 'zod';

// --- Enums ---

export enum RiskClass {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum RunStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum EventType {
  RUN_STARTED = 'RunStarted',
  RUN_ENDED = 'RunEnded',
  MODEL_CALL_REQUESTED = 'ModelCallRequested',
  MODEL_CALL_COMPLETED = 'ModelCallCompleted',
  PLAN_PROPOSED = 'PlanProposed',
  PLAN_ACCEPTED = 'PlanAccepted',
  PLAN_REVISED = 'PlanRevised',
  TOOL_CALL_REQUESTED = 'ToolCallRequested',
  TOOL_CALL_COMPLETED = 'ToolCallCompleted',
  TOOL_CALL_FAILED = 'ToolCallFailed',
  RETRIEVAL_QUERY = 'RetrievalQuery',
  RETRIEVAL_RESULT = 'RetrievalResult',
  ASSERTION_RAISED = 'AssertionRaised',
  ASSERTION_CHECKED = 'AssertionChecked',
  POLICY_DECISION = 'PolicyDecision',
  COST_UPDATE = 'CostUpdate',
  HUMAN_FEEDBACK_RECEIVED = 'HumanFeedbackReceived',
  AUTO_GRADE_COMPUTED = 'AutoGradeComputed',
}

// --- Zod Schemas & Types ---

// 1. Tool
export const ToolSchema = z.object({
  tool_id: z.string(),
  name: z.string(),
  description: z.string(),
  schema_in: z.record(z.any()), // JSON Schema
  schema_out: z.record(z.any()), // JSON Schema
  scopes_required: z.array(z.string()),
  risk_class: z.nativeEnum(RiskClass),
  limits: z.object({
    timeout_ms: z.number().optional(),
    max_retries: z.number().optional(),
    cost_per_call: z.number().optional(),
  }).optional(),
});
export type Tool = z.infer<typeof ToolSchema>;

// 2. Run
export const BudgetSchema = z.object({
  max_cost: z.number().optional(),
  max_time_ms: z.number().optional(),
  max_steps: z.number().optional(),
});

export const RunSchema = z.object({
  run_id: z.string(),
  tenant_id: z.string(),
  project_id: z.string(),
  policy_profile: z.string(),
  created_at: z.date(), // Hydration handled by store
  status: z.nativeEnum(RunStatus),
  budgets: BudgetSchema.optional(),
});
export type Run = z.infer<typeof RunSchema>;

// 3. Event
export const EventSchema = z.object({
  event_id: z.string(),
  run_id: z.string(),
  ts: z.date(),
  type: z.nativeEnum(EventType),
  payload: z.record(z.any()),
  hash: z.string().optional(), // Content hash for ledger integrity
  parent_event_id: z.string().optional(), // For causality tracking
});
export type Event = z.infer<typeof EventSchema>;

// 4. Evidence
export const EvidenceSchema = z.object({
  evidence_id: z.string(),
  source: z.string(),
  retrieved_at: z.date(),
  content_hash: z.string(),
  snippet: z.string(),
  uri: z.string().optional(),
  policy_tags: z.array(z.string()).optional(),
});
export type Evidence = z.infer<typeof EvidenceSchema>;

// 5. Claim Link (Provenance)
export const ClaimLinkSchema = z.object({
  claim_id: z.string(),
  output_id: z.string(), // ID of the tool output or model generation
  evidence_ids: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  notes: z.string().optional(),
});
export type ClaimLink = z.infer<typeof ClaimLinkSchema>;
