/**
 * Core Agent Types and Interfaces
 * Defines the foundational types for the multi-agent system
 */

import { z } from 'zod';

// Agent States
export enum AgentState {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  READY = 'ready',
  WORKING = 'working',
  PAUSED = 'paused',
  ERROR = 'error',
  TERMINATED = 'terminated',
}

// Agent Capabilities
export enum AgentCapability {
  // Data Collection
  OSINT_COLLECTION = 'osint_collection',
  WEB_SCRAPING = 'web_scraping',
  API_INTEGRATION = 'api_integration',
  DATABASE_QUERY = 'database_query',

  // Analysis
  NLP_ANALYSIS = 'nlp_analysis',
  GRAPH_ANALYSIS = 'graph_analysis',
  SENTIMENT_ANALYSIS = 'sentiment_analysis',
  PATTERN_RECOGNITION = 'pattern_recognition',
  ANOMALY_DETECTION = 'anomaly_detection',

  // Synthesis
  REPORT_GENERATION = 'report_generation',
  SUMMARIZATION = 'summarization',
  VISUALIZATION = 'visualization',

  // Monitoring
  ALERTING = 'alerting',
  HEALTH_MONITORING = 'health_monitoring',
  METRIC_COLLECTION = 'metric_collection',

  // Reasoning
  LLM_REASONING = 'llm_reasoning',
  DECISION_MAKING = 'decision_making',
  HYPOTHESIS_GENERATION = 'hypothesis_generation',
}

// Agent Priority Levels
export enum AgentPriority {
  CRITICAL = 0,
  HIGH = 1,
  NORMAL = 2,
  LOW = 3,
  BACKGROUND = 4,
}

// Task Status
export enum TaskStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout',
}

// Agent Configuration Schema
export const AgentConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  version: z.string(),
  capabilities: z.array(z.nativeEnum(AgentCapability)),
  priority: z.nativeEnum(AgentPriority).default(AgentPriority.NORMAL),
  resources: z
    .object({
      maxConcurrentTasks: z.number().default(5),
      maxMemoryMB: z.number().optional(),
      maxCpuPercent: z.number().optional(),
      timeout: z.number().default(300000), // 5 minutes default
    })
    .optional(),
  llmConfig: z
    .object({
      provider: z.enum(['anthropic', 'openai', 'local']),
      model: z.string(),
      temperature: z.number().default(0.7),
      maxTokens: z.number().default(4096),
      systemPrompt: z.string().optional(),
    })
    .optional(),
  metadata: z.record(z.any()).optional(),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

// Task Schema
export const TaskSchema = z.object({
  id: z.string(),
  type: z.string(),
  agentId: z.string().optional(),
  priority: z.nativeEnum(AgentPriority).default(AgentPriority.NORMAL),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.PENDING),
  input: z.record(z.any()),
  output: z.record(z.any()).optional(),
  error: z.string().optional(),
  dependencies: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional(),
  humanReviewRequired: z.boolean().default(false),
  humanReviewStatus: z.enum(['pending', 'approved', 'rejected']).optional(),
});

export type Task = z.infer<typeof TaskSchema>;

// Agent Message Schema
export const AgentMessageSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string().or(z.array(z.string())),
  type: z.enum([
    'request',
    'response',
    'broadcast',
    'query',
    'notification',
    'error',
  ]),
  payload: z.record(z.any()),
  timestamp: z.string().datetime(),
  correlationId: z.string().optional(),
  replyTo: z.string().optional(),
});

export type AgentMessage = z.infer<typeof AgentMessageSchema>;

// Agent Metrics Schema
export const AgentMetricsSchema = z.object({
  agentId: z.string(),
  tasksCompleted: z.number().default(0),
  tasksFailed: z.number().default(0),
  averageExecutionTime: z.number().default(0),
  totalExecutionTime: z.number().default(0),
  memoryUsage: z.number().optional(),
  cpuUsage: z.number().optional(),
  apiCallsCount: z.number().default(0),
  apiCostUSD: z.number().default(0),
  lastHealthCheck: z.string().datetime().optional(),
  healthStatus: z.enum(['healthy', 'degraded', 'unhealthy']).default('healthy'),
  customMetrics: z.record(z.any()).optional(),
});

export type AgentMetrics = z.infer<typeof AgentMetricsSchema>;

// Agent Context for LLM interactions
export const AgentContextSchema = z.object({
  agentId: z.string(),
  conversationHistory: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
      timestamp: z.string().datetime(),
    }),
  ),
  workingMemory: z.record(z.any()),
  knowledgeBase: z.array(z.string()).optional(),
  currentTask: z.string().optional(),
  relatedAgents: z.array(z.string()).optional(),
});

export type AgentContext = z.infer<typeof AgentContextSchema>;

// Workflow Definition
export const WorkflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  version: z.string(),
  tasks: z.array(
    z.object({
      id: z.string(),
      agentType: z.string(),
      input: z.record(z.any()),
      dependencies: z.array(z.string()).default([]),
      condition: z.string().optional(), // Expression for conditional execution
    }),
  ),
  metadata: z.record(z.any()).optional(),
});

export type Workflow = z.infer<typeof WorkflowSchema>;

// Agent Interface
export interface IAgent {
  readonly id: string;
  readonly config: AgentConfig;
  state: AgentState;
  metrics: AgentMetrics;

  // Lifecycle methods
  initialize(): Promise<void>;
  start(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  terminate(): Promise<void>;

  // Task execution
  executeTask(task: Task): Promise<Task>;
  canHandleTask(task: Task): boolean;

  // Communication
  sendMessage(message: AgentMessage): Promise<void>;
  receiveMessage(message: AgentMessage): Promise<void>;

  // Health
  healthCheck(): Promise<boolean>;
  getMetrics(): AgentMetrics;
}

// Agent Event Types
export enum AgentEventType {
  STATE_CHANGED = 'state_changed',
  TASK_STARTED = 'task_started',
  TASK_COMPLETED = 'task_completed',
  TASK_FAILED = 'task_failed',
  MESSAGE_SENT = 'message_sent',
  MESSAGE_RECEIVED = 'message_received',
  ERROR_OCCURRED = 'error_occurred',
  HEALTH_CHECK_COMPLETED = 'health_check_completed',
  RESOURCE_LIMIT_REACHED = 'resource_limit_reached',
}

export interface AgentEvent {
  type: AgentEventType;
  agentId: string;
  timestamp: string;
  data: any;
}
