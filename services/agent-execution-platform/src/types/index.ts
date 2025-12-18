/**
 * Core type definitions for the Agent Execution Platform
 */

// ========================================
// AGENT TYPES
// ========================================

export type AgentStatus = 
  | 'idle' 
  | 'running' 
  | 'paused' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export type AgentPriority = 'low' | 'normal' | 'high' | 'critical';

export interface AgentMetadata {
  id: string;
  name: string;
  version: string;
  description?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentCapabilities {
  maxConcurrent: number;
  timeout: number;
  retryable: boolean;
  maxRetries: number;
  supportedOperations: string[];
}

export interface AgentConfig {
  metadata: AgentMetadata;
  capabilities: AgentCapabilities;
  environment?: Record<string, string>;
  resources?: ResourceLimits;
}

export interface ResourceLimits {
  maxMemoryMB: number;
  maxCPUPercent: number;
  maxDurationSeconds: number;
  maxTokens?: number;
}

export interface AgentContext {
  agentId: string;
  executionId: string;
  userId: string;
  sessionId: string;
  metadata: Record<string, any>;
  variables: Record<string, any>;
}

export interface AgentResult {
  success: boolean;
  data?: any;
  error?: AgentError;
  metrics: ExecutionMetrics;
  artifacts?: Artifact[];
}

export interface AgentError {
  code: string;
  message: string;
  details?: Record<string, any>;
  stack?: string;
  recoverable: boolean;
}

// ========================================
// PIPELINE TYPES
// ========================================

export type StepStatus = 
  | 'pending' 
  | 'running' 
  | 'completed' 
  | 'failed' 
  | 'skipped' 
  | 'cancelled';

export type StepType = 
  | 'task' 
  | 'parallel' 
  | 'sequential' 
  | 'conditional' 
  | 'loop';

export interface PipelineStep {
  id: string;
  name: string;
  type: StepType;
  status: StepStatus;
  config: StepConfig;
  dependencies: string[];
  retryConfig?: RetryConfig;
  timeoutMs?: number;
}

export interface StepConfig {
  operation: string;
  parameters: Record<string, any>;
  condition?: string;
  loopConfig?: LoopConfig;
  errorStrategy?: ErrorStrategy;
}

export interface LoopConfig {
  iterator: string;
  maxIterations: number;
  breakCondition?: string;
}

export interface RetryConfig {
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
  retryableErrors?: string[];
}

export type ErrorStrategy = 
  | 'fail-fast' 
  | 'continue' 
  | 'retry' 
  | 'fallback';

export interface PipelineDefinition {
  id: string;
  name: string;
  version: string;
  description?: string;
  steps: PipelineStep[];
  variables?: Record<string, any>;
  triggers?: PipelineTrigger[];
}

export interface PipelineTrigger {
  type: 'manual' | 'scheduled' | 'event' | 'webhook';
  config: Record<string, any>;
}

export interface PipelineExecution {
  id: string;
  pipelineId: string;
  status: AgentStatus;
  startTime: Date;
  endTime?: Date;
  steps: StepExecution[];
  context: AgentContext;
  result?: AgentResult;
}

export interface StepExecution {
  stepId: string;
  status: StepStatus;
  startTime?: Date;
  endTime?: Date;
  attempts: number;
  result?: any;
  error?: AgentError;
}

// ========================================
// PROMPT REGISTRY TYPES
// ========================================

export interface PromptTemplate {
  id: string;
  name: string;
  version: string;
  content: string;
  variables: PromptVariable[];
  metadata: PromptMetadata;
  tags: string[];
}

export interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  default?: any;
  description?: string;
  validation?: ValidationRule;
}

export interface ValidationRule {
  pattern?: string;
  min?: number;
  max?: number;
  enum?: any[];
  custom?: string;
}

export interface PromptMetadata {
  author: string;
  createdAt: Date;
  updatedAt: Date;
  description?: string;
  category?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface RenderedPrompt {
  content: string;
  metadata: PromptMetadata;
  variables: Record<string, any>;
  renderedAt: Date;
}

export interface PromptVersion {
  version: string;
  content: string;
  createdAt: Date;
  createdBy: string;
  changelog?: string;
  deprecated?: boolean;
}

// ========================================
// SAFETY LAYER TYPES
// ========================================

export type SafetyLevel = 'none' | 'low' | 'medium' | 'high' | 'paranoid';

export interface SafetyConfig {
  level: SafetyLevel;
  enabledChecks: SafetyCheck[];
  customRules?: SafetyRule[];
  actionOnViolation: SafetyAction;
}

export type SafetyCheck = 
  | 'input-validation'
  | 'output-filtering'
  | 'pii-detection'
  | 'malicious-content'
  | 'rate-limiting'
  | 'content-moderation'
  | 'injection-detection';

export interface SafetyRule {
  id: string;
  name: string;
  check: SafetyCheck;
  severity: 'info' | 'warning' | 'error' | 'critical';
  pattern?: string;
  action: SafetyAction;
  enabled: boolean;
}

export type SafetyAction = 
  | 'allow' 
  | 'warn' 
  | 'block' 
  | 'sanitize' 
  | 'audit';

export interface SafetyViolation {
  ruleId: string;
  check: SafetyCheck;
  severity: string;
  message: string;
  details: Record<string, any>;
  timestamp: Date;
  action: SafetyAction;
}

export interface SafetyReport {
  passed: boolean;
  violations: SafetyViolation[];
  sanitizedContent?: string;
  timestamp: Date;
  executionId: string;
}

export interface PIIDetectionResult {
  found: boolean;
  entities: PIIEntity[];
  confidence: number;
  redactedText?: string;
}

export interface PIIEntity {
  type: string;
  value: string;
  start: number;
  end: number;
  confidence: number;
}

// ========================================
// LOGGING TYPES
// ========================================

export type LogLevel = 
  | 'trace' 
  | 'debug' 
  | 'info' 
  | 'warn' 
  | 'error' 
  | 'fatal';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context: LogContext;
  metadata?: Record<string, any>;
  error?: Error;
  traceId?: string;
  spanId?: string;
}

export interface LogContext {
  executionId?: string;
  agentId?: string;
  pipelineId?: string;
  stepId?: string;
  userId?: string;
  sessionId?: string;
  operation?: string;
}

export interface LogTransport {
  name: string;
  level: LogLevel;
  enabled: boolean;
  format?: LogFormat;
  destination?: string;
}

export type LogFormat = 'json' | 'text' | 'pretty';

export interface LogQuery {
  startTime?: Date;
  endTime?: Date;
  level?: LogLevel;
  context?: Partial<LogContext>;
  search?: string;
  limit?: number;
  offset?: number;
}

// ========================================
// EXECUTION METRICS
// ========================================

export interface ExecutionMetrics {
  executionId: string;
  startTime: Date;
  endTime?: Date;
  durationMs: number;
  cpuUsagePercent?: number;
  memoryUsageMB?: number;
  tokensConsumed?: number;
  apiCalls?: number;
  retries?: number;
  errors?: number;
  custom?: Record<string, number>;
}

export interface PerformanceMetrics {
  avgExecutionTimeMs: number;
  p50ExecutionTimeMs: number;
  p95ExecutionTimeMs: number;
  p99ExecutionTimeMs: number;
  successRate: number;
  errorRate: number;
  throughput: number;
}

// ========================================
// ARTIFACT TYPES
// ========================================

export interface Artifact {
  id: string;
  name: string;
  type: string;
  mimeType: string;
  size: number;
  content?: string;
  url?: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

// ========================================
// EVENT TYPES
// ========================================

export type EventType = 
  | 'agent.started'
  | 'agent.completed'
  | 'agent.failed'
  | 'agent.cancelled'
  | 'pipeline.started'
  | 'pipeline.step.started'
  | 'pipeline.step.completed'
  | 'pipeline.step.failed'
  | 'pipeline.completed'
  | 'pipeline.failed'
  | 'safety.violation'
  | 'prompt.rendered'
  | 'log.created';

export interface Event {
  id: string;
  type: EventType;
  timestamp: Date;
  source: string;
  data: Record<string, any>;
  correlationId?: string;
}

export interface EventHandler {
  eventType: EventType;
  handler: (event: Event) => Promise<void>;
  priority?: number;
}

// ========================================
// API TYPES
// ========================================

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    requestId: string;
    timestamp: Date;
    version: string;
  };
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
}
