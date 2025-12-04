/**
 * Multi-LLM Orchestrator Types
 *
 * Core type definitions for the resilient multi-LLM orchestrator
 * with governance gates and hallucination scoring.
 */

import { z } from 'zod';

// ============================================================================
// LLM Provider Types
// ============================================================================

export type LLMProvider = 'claude' | 'gpt' | 'o1' | 'local';

export type LLMModel =
  | 'claude-3-5-sonnet-20241022'
  | 'claude-3-opus-20240229'
  | 'claude-3-haiku-20240307'
  | 'gpt-4-turbo'
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'o1-preview'
  | 'o1-mini'
  | 'local-llama';

export interface LLMProviderConfig {
  provider: LLMProvider;
  model: LLMModel;
  apiKey?: string;
  baseUrl?: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
  retries: number;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface LLMRequest {
  messages: LLMMessage[];
  model?: LLMModel;
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LLMResponse {
  id: string;
  model: LLMModel;
  provider: LLMProvider;
  content: string;
  toolCalls?: ToolCall[];
  usage: TokenUsage;
  latencyMs: number;
  cached: boolean;
  metadata?: Record<string, unknown>;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUSD: number;
}

// ============================================================================
// Chain Types
// ============================================================================

export type ChainStrategy = 'sequential' | 'parallel' | 'fallback' | 'consensus';

export interface ChainStep {
  id: string;
  name: string;
  provider: LLMProvider;
  model?: LLMModel;
  prompt?: string;
  systemPrompt?: string;
  dependsOn?: string[];
  timeout?: number;
  retries?: number;
  fallback?: ChainStep;
  transform?: (input: string, context: ChainContext) => string;
  validate?: (output: string, context: ChainContext) => ValidationResult;
}

export interface ChainConfig {
  id: string;
  name: string;
  description: string;
  strategy: ChainStrategy;
  steps: ChainStep[];
  governanceGates: GovernanceGate[];
  timeout: number;
  maxRetries: number;
  budget: BudgetConfig;
}

export interface ChainContext {
  chainId: string;
  stepId: string;
  sessionId: string;
  userId: string;
  startTime: Date;
  variables: Record<string, unknown>;
  history: LLMMessage[];
  metadata: Record<string, unknown>;
}

export interface ChainResult {
  chainId: string;
  success: boolean;
  output: string;
  steps: StepResult[];
  totalLatencyMs: number;
  totalCostUSD: number;
  totalTokens: number;
  governanceViolations: GovernanceViolation[];
  hallucinationScore: HallucinationScore;
  metadata?: Record<string, unknown>;
}

export interface StepResult {
  stepId: string;
  stepName: string;
  provider: LLMProvider;
  model: LLMModel;
  success: boolean;
  output: string;
  latencyMs: number;
  costUSD: number;
  tokens: TokenUsage;
  error?: string;
  retries: number;
  usedFallback: boolean;
  hallucinationScore?: HallucinationScore;
}

// ============================================================================
// Circuit Breaker Types
// ============================================================================

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  monitoringWindow: number;
}

export interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure?: Date;
  lastSuccess?: Date;
  nextAttempt?: Date;
}

// ============================================================================
// Governance Types
// ============================================================================

export type GovernanceGateType =
  | 'content-filter'
  | 'pii-detection'
  | 'toxicity-check'
  | 'prompt-injection'
  | 'rate-limit'
  | 'budget-limit'
  | 'data-residency'
  | 'classification-level'
  | 'custom';

export interface GovernanceGate {
  id: string;
  name: string;
  type: GovernanceGateType;
  enabled: boolean;
  config: GovernanceGateConfig;
  action: 'block' | 'warn' | 'log' | 'redact';
}

export interface GovernanceGateConfig {
  threshold?: number;
  patterns?: string[];
  allowList?: string[];
  blockList?: string[];
  maxRequests?: number;
  maxBudgetUSD?: number;
  allowedRegions?: string[];
  requiredClassification?: string;
  customValidator?: (input: string, context: ChainContext) => Promise<ValidationResult>;
}

export interface GovernanceViolation {
  gateId: string;
  gateName: string;
  gateType: GovernanceGateType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  action: 'blocked' | 'warned' | 'logged' | 'redacted';
  timestamp: Date;
  input?: string;
  matched?: string[];
}

export interface ValidationResult {
  valid: boolean;
  score: number;
  issues: ValidationIssue[];
}

export interface ValidationIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  location?: { start: number; end: number };
}

// ============================================================================
// Hallucination Scoring Types
// ============================================================================

export interface HallucinationScore {
  overall: number; // 0-1 (0 = definitely hallucinated, 1 = definitely factual)
  confidence: number; // 0-1
  factors: HallucinationFactor[];
  sources: SourceVerification[];
  recommendations: string[];
}

export interface HallucinationFactor {
  name: string;
  score: number;
  weight: number;
  details: string;
}

export interface SourceVerification {
  claim: string;
  verified: boolean;
  source?: string;
  confidence: number;
}

export interface HallucinationConfig {
  enabled: boolean;
  minimumScore: number;
  factCheckingEnabled: boolean;
  crossReferenceEnabled: boolean;
  sourceVerificationEnabled: boolean;
  consensusThreshold: number;
}

// ============================================================================
// State Types
// ============================================================================

export interface SessionState {
  sessionId: string;
  userId: string;
  chainId?: string;
  messages: LLMMessage[];
  context: Record<string, unknown>;
  usage: TokenUsage;
  governanceViolations: GovernanceViolation[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

export interface ProviderState {
  provider: LLMProvider;
  model: LLMModel;
  circuitBreaker: CircuitBreakerState;
  metrics: ProviderMetrics;
  lastHealthCheck: Date;
  healthy: boolean;
}

export interface ProviderMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  totalTokens: number;
  totalCostUSD: number;
  lastReset: Date;
}

// ============================================================================
// Budget Types
// ============================================================================

export interface BudgetConfig {
  maxRequestCostUSD: number;
  maxChainCostUSD: number;
  maxDailyCostUSD: number;
  maxMonthlyCostUSD: number;
  warningThreshold: number; // 0-1
  enforcementMode: 'soft' | 'hard';
}

export interface BudgetState {
  dailyUsedUSD: number;
  monthlyUsedUSD: number;
  lastReset: Date;
  history: BudgetEntry[];
}

export interface BudgetEntry {
  timestamp: Date;
  chainId: string;
  stepId: string;
  provider: LLMProvider;
  model: LLMModel;
  costUSD: number;
  tokens: number;
}

// ============================================================================
// Event Types
// ============================================================================

export type OrchestratorEvent =
  | 'chain:started'
  | 'chain:completed'
  | 'chain:failed'
  | 'step:started'
  | 'step:completed'
  | 'step:failed'
  | 'step:retrying'
  | 'step:fallback'
  | 'governance:violation'
  | 'governance:blocked'
  | 'circuit:opened'
  | 'circuit:closed'
  | 'circuit:half-open'
  | 'budget:warning'
  | 'budget:exceeded'
  | 'hallucination:detected';

export interface OrchestratorEventPayload {
  event: OrchestratorEvent;
  timestamp: Date;
  sessionId: string;
  chainId?: string;
  stepId?: string;
  data: Record<string, unknown>;
}

// ============================================================================
// Zod Schemas for Runtime Validation
// ============================================================================

export const LLMMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.string(),
  name: z.string().optional(),
  toolCalls: z.array(z.object({
    id: z.string(),
    type: z.literal('function'),
    function: z.object({
      name: z.string(),
      arguments: z.string(),
    }),
  })).optional(),
  toolCallId: z.string().optional(),
});

export const LLMRequestSchema = z.object({
  messages: z.array(LLMMessageSchema),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  stream: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const GovernanceGateSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum([
    'content-filter',
    'pii-detection',
    'toxicity-check',
    'prompt-injection',
    'rate-limit',
    'budget-limit',
    'data-residency',
    'classification-level',
    'custom',
  ]),
  enabled: z.boolean(),
  action: z.enum(['block', 'warn', 'log', 'redact']),
});

export const ChainConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  strategy: z.enum(['sequential', 'parallel', 'fallback', 'consensus']),
  timeout: z.number().positive(),
  maxRetries: z.number().nonnegative(),
});
