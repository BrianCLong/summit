/**
 * Distributed Queue Types
 *
 * Type definitions for the resilient distributed queue system with Redis failover.
 * Supports agent fleets, air-gapped environments, and parallel task orchestration.
 */

import { Job, JobsOptions } from 'bullmq';

// ============================================================================
// Connection & Failover Types
// ============================================================================

export type RedisNodeRole = 'primary' | 'replica' | 'sentinel';
export type ConnectionState =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'failed';
export type FailoverMode = 'automatic' | 'manual' | 'airgap-safe';

export interface RedisNodeConfig {
  host: string;
  port: number;
  role: RedisNodeRole;
  weight?: number; // For load balancing
  datacenter?: string;
  airgapCompatible?: boolean;
}

export interface RedisClusterConfig {
  nodes: RedisNodeConfig[];
  sentinels?: { host: string; port: number }[];
  masterName?: string;
  password?: string;
  db?: number;
  // Connection pool settings
  poolSize?: number;
  minPoolSize?: number;
  maxPoolSize?: number;
  acquireTimeout?: number;
  idleTimeout?: number;
  // Failover settings
  failoverMode?: FailoverMode;
  failoverTimeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  healthCheckInterval?: number;
  // Air-gapped settings
  airgapMode?: boolean;
  localFallbackPath?: string;
}

export interface ConnectionPoolStats {
  total: number;
  active: number;
  idle: number;
  waiting: number;
  created: number;
  destroyed: number;
  healthyNodes: number;
  unhealthyNodes: number;
}

export interface FailoverEvent {
  id: string;
  timestamp: Date;
  fromNode: RedisNodeConfig;
  toNode: RedisNodeConfig;
  reason: FailoverReason;
  duration: number;
  success: boolean;
  automatic: boolean;
}

export type FailoverReason =
  | 'node-failure'
  | 'timeout'
  | 'connection-lost'
  | 'health-check-failed'
  | 'manual-trigger'
  | 'airgap-activation'
  | 'load-balancing';

// ============================================================================
// Distributed Queue Types
// ============================================================================

export enum DistributedPriority {
  CRITICAL = 1,
  URGENT = 2,
  HIGH = 3,
  NORMAL = 5,
  LOW = 7,
  BACKGROUND = 10,
}

export interface DistributedJobOptions extends JobsOptions {
  priority?: DistributedPriority;
  partition?: string;
  agentId?: string;
  fleetId?: string;
  correlationId?: string;
  idempotencyKey?: string;
  routingKey?: string;
  timeout?: number;
  retryStrategy?: RetryStrategy;
  deadLetterConfig?: DeadLetterConfig;
  metadata?: JobMetadata;
}

export interface RetryStrategy {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  multiplier: number;
  jitter?: boolean;
  retryOn?: string[]; // Error types to retry
  skipOn?: string[]; // Error types to skip
}

export interface DeadLetterConfig {
  enabled: boolean;
  queueName?: string;
  maxAge?: number; // Max age in DLQ before expiry
  alertOnThreshold?: number;
}

export interface JobMetadata {
  createdBy?: string;
  tenant?: string;
  environment?: string;
  tags?: string[];
  traceId?: string;
  spanId?: string;
  customData?: Record<string, unknown>;
}

export interface DistributedJob<T = unknown> {
  id: string;
  name: string;
  data: T;
  options: DistributedJobOptions;
  status: JobStatus;
  partition: string;
  progress: number;
  attemptsMade: number;
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  failedReason?: string;
  returnValue?: unknown;
}

export type JobStatus =
  | 'waiting'
  | 'active'
  | 'completed'
  | 'failed'
  | 'delayed'
  | 'paused'
  | 'dead-letter';

export interface QueuePartition {
  id: string;
  name: string;
  weight: number;
  maxConcurrency: number;
  rateLimit?: { max: number; duration: number };
  dedicated?: boolean;
}

export interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
  deadLetter: number;
  throughput: number;
  avgProcessingTime: number;
  errorRate: number;
  partitions: Map<string, PartitionStats>;
}

export interface PartitionStats {
  id: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

// ============================================================================
// Agent Fleet Types
// ============================================================================

export type AgentStatus =
  | 'online'
  | 'offline'
  | 'busy'
  | 'idle'
  | 'degraded'
  | 'draining';

export interface AgentInfo {
  id: string;
  fleetId: string;
  name: string;
  status: AgentStatus;
  capabilities: string[];
  maxConcurrency: number;
  currentLoad: number;
  lastHeartbeat: Date;
  metadata?: Record<string, unknown>;
}

export interface FleetInfo {
  id: string;
  name: string;
  agents: Map<string, AgentInfo>;
  totalCapacity: number;
  currentLoad: number;
  healthScore: number;
}

export type NotificationType =
  | 'job-available'
  | 'job-assigned'
  | 'job-completed'
  | 'job-failed'
  | 'agent-joined'
  | 'agent-left'
  | 'fleet-scaling'
  | 'failover-initiated'
  | 'failover-completed'
  | 'health-alert';

export interface FleetNotification {
  id: string;
  type: NotificationType;
  timestamp: Date;
  fleetId?: string;
  agentId?: string;
  jobId?: string;
  payload: Record<string, unknown>;
  priority: DistributedPriority;
  ttl?: number;
  acknowledged?: boolean;
}

export interface NotificationSubscription {
  id: string;
  agentId: string;
  types: NotificationType[];
  filter?: NotificationFilter;
  callback: (notification: FleetNotification) => void | Promise<void>;
}

export interface NotificationFilter {
  fleetIds?: string[];
  agentIds?: string[];
  jobTypes?: string[];
  priorities?: DistributedPriority[];
  tags?: string[];
}

// ============================================================================
// Air-Gap Failover Types
// ============================================================================

export type AirgapState =
  | 'connected'
  | 'degraded'
  | 'airgapped'
  | 'recovering';

export interface AirgapConfig {
  enabled: boolean;
  detectionInterval: number;
  recoveryThreshold: number;
  localStoragePath: string;
  maxLocalQueueSize: number;
  syncBatchSize: number;
  encryptLocalStorage: boolean;
}

export interface AirgapStatus {
  state: AirgapState;
  lastConnectedAt?: Date;
  airgappedSince?: Date;
  pendingJobs: number;
  localQueueSize: number;
  syncProgress?: number;
}

export interface SyncOperation {
  id: string;
  type: 'upload' | 'download' | 'reconcile';
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  jobsCount: number;
  bytesTransferred: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

// ============================================================================
// Codex Task Orchestration Types
// ============================================================================

export type CodexTaskType =
  | 'code-generation'
  | 'code-review'
  | 'refactoring'
  | 'testing'
  | 'documentation'
  | 'analysis'
  | 'custom';

export interface CodexTask {
  id: string;
  type: CodexTaskType;
  input: CodexTaskInput;
  config: CodexTaskConfig;
  status: CodexTaskStatus;
  result?: CodexTaskResult;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface CodexTaskInput {
  prompt: string;
  context?: string;
  files?: string[];
  language?: string;
  constraints?: string[];
}

export interface CodexTaskConfig {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  retries?: number;
  parallel?: boolean;
  dependsOn?: string[];
}

export type CodexTaskStatus =
  | 'pending'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout';

export interface CodexTaskResult {
  output: string;
  artifacts?: string[];
  tokens: { input: number; output: number };
  latency: number;
  model: string;
}

export interface CodexBatch {
  id: string;
  tasks: CodexTask[];
  strategy: BatchStrategy;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'partial';
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
}

export type BatchStrategy =
  | 'parallel'
  | 'sequential'
  | 'dependency-graph'
  | 'rate-limited';

export interface BatchConfig {
  strategy: BatchStrategy;
  maxParallel?: number;
  rateLimit?: { max: number; window: number };
  failFast?: boolean;
  continueOnError?: boolean;
}

// ============================================================================
// E2E Testing Types
// ============================================================================

export interface TestingHookConfig {
  enabled: boolean;
  interceptors: TestInterceptor[];
  mockResponses?: Map<string, unknown>;
  latencySimulation?: LatencyConfig;
  errorInjection?: ErrorInjectionConfig;
}

export interface TestInterceptor {
  name: string;
  phase: 'before' | 'after' | 'error';
  matcher: (job: DistributedJob) => boolean;
  handler: (job: DistributedJob, context: TestContext) => void | Promise<void>;
}

export interface TestContext {
  testId: string;
  startTime: Date;
  events: TestEvent[];
  assertions: TestAssertion[];
  metrics: TestMetrics;
}

export interface TestEvent {
  timestamp: Date;
  type: string;
  jobId?: string;
  data: Record<string, unknown>;
}

export interface TestAssertion {
  name: string;
  passed: boolean;
  expected: unknown;
  actual: unknown;
  message?: string;
}

export interface TestMetrics {
  jobsProcessed: number;
  avgLatency: number;
  errorRate: number;
  throughput: number;
  failoverCount: number;
}

export interface LatencyConfig {
  min: number;
  max: number;
  distribution: 'uniform' | 'normal' | 'exponential';
}

export interface ErrorInjectionConfig {
  rate: number; // 0-1 probability
  types: string[];
  targets?: string[]; // Job names to target
}

// ============================================================================
// Event Emitter Types
// ============================================================================

export interface DistributedQueueEvents {
  'job:added': (job: DistributedJob) => void;
  'job:active': (job: DistributedJob) => void;
  'job:completed': (job: DistributedJob, result: unknown) => void;
  'job:failed': (job: DistributedJob, error: Error) => void;
  'job:progress': (job: DistributedJob, progress: number) => void;
  'job:stalled': (jobId: string) => void;
  'job:dead-letter': (job: DistributedJob) => void;
  'partition:created': (partition: QueuePartition) => void;
  'partition:removed': (partitionId: string) => void;
  'failover:initiated': (event: FailoverEvent) => void;
  'failover:completed': (event: FailoverEvent) => void;
  'failover:failed': (event: FailoverEvent, error: Error) => void;
  'airgap:detected': (status: AirgapStatus) => void;
  'airgap:recovered': (status: AirgapStatus) => void;
  'sync:started': (operation: SyncOperation) => void;
  'sync:completed': (operation: SyncOperation) => void;
  'health:degraded': (stats: QueueStats) => void;
  'health:recovered': (stats: QueueStats) => void;
}
