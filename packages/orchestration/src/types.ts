import { SpanStatusCode } from '@opentelemetry/api';

export type AutonomyMode = 'HITL' | 'HOTL' | 'HOOTL';

export interface AgentCapability {
  id: string;
  name: string;
  version: string;
  modalities: string[];
  tools: string[];
  costHint?: string;
  trustTier?: 'low' | 'medium' | 'high';
}

export type StepKind = 'LLM' | 'TOOL' | 'RETRIEVE' | 'TRANSFORM' | 'HUMAN_APPROVAL';

export interface StepConstraint {
  name: string;
  value: string | number | boolean;
}

export interface Step {
  id: string;
  name: string;
  kind: StepKind;
  inputs: Record<string, unknown>;
  outputsSchema?: Record<string, unknown>;
  constraints?: StepConstraint[];
  dependencies?: string[];
  parallelGroup?: string;
}

export interface OrchestrationPlan {
  id: string;
  steps: Step[];
  description?: string;
  createdAt: string;
}

export type StepStatus =
  | 'pending'
  | 'running'
  | 'waiting_approval'
  | 'completed'
  | 'blocked'
  | 'failed';

export interface StepResult {
  stepId: string;
  status: StepStatus;
  output?: unknown;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  policyDecision?: string;
}

export interface RunResult {
  runId: string;
  planId: string;
  mode: AutonomyMode;
  startedAt: string;
  completedAt?: string;
  steps: StepResult[];
  metadata?: Record<string, unknown>;
}

export interface PlanRequest {
  goal: string;
  inputs?: Record<string, unknown>;
  context?: string;
}

export interface PlanContext {
  shapedContext: string;
  provenance: string[];
}

export interface ExecutionGuardrail {
  name: string;
  description?: string;
  policyRef?: string;
}

export interface ExecutionOptions {
  mode: AutonomyMode;
  guardrails?: ExecutionGuardrail[];
  planContext?: PlanContext;
}

export const OTEL_STATUS_OK = SpanStatusCode.OK;
export const OTEL_STATUS_ERROR = SpanStatusCode.ERROR;
