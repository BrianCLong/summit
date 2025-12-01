/**
 * Resilient Workflow Orchestration Types
 * Supports hybrid, denied, and degraded network environments
 */

import { z } from 'zod';

// ============================================================================
// Network & Topology Types
// ============================================================================

export type NetworkCondition = 'nominal' | 'degraded' | 'denied' | 'satellite-only' | 'offline';

export type CommChannel = 'primary' | 'secondary' | 'satellite' | 'mesh' | 'store-forward';

export interface NetworkNode {
  id: string;
  name: string;
  type: 'command' | 'field' | 'coalition' | 'relay' | 'edge';
  endpoints: Endpoint[];
  condition: NetworkCondition;
  priority: number;
  lastSeen: Date;
  capabilities: string[];
  metadata: Record<string, unknown>;
}

export interface Endpoint {
  id: string;
  protocol: 'tcp' | 'udp' | 'satellite' | 'hf-radio' | 'mesh';
  address: string;
  port: number;
  latencyMs: number;
  bandwidthKbps: number;
  available: boolean;
  securityLevel: 'unclass' | 'secret' | 'topsecret';
}

export interface Route {
  id: string;
  source: string;
  destination: string;
  hops: string[];
  channel: CommChannel;
  estimatedLatencyMs: number;
  reliability: number; // 0-1
  priority: number;
  active: boolean;
}

// ============================================================================
// Workflow Types
// ============================================================================

export type WorkflowState =
  | 'pending'
  | 'running'
  | 'paused'
  | 'healing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type TaskState =
  | 'pending'
  | 'queued'
  | 'running'
  | 'retrying'
  | 'checkpointed'
  | 'completed'
  | 'failed'
  | 'skipped';

export interface Workflow {
  id: string;
  name: string;
  version: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
  tasks: Task[];
  state: WorkflowState;
  checkpoint?: Checkpoint;
  createdAt: Date;
  updatedAt: Date;
  deadline?: Date;
  owner: string;
  coalitionPartners?: string[];
  metadata: Record<string, unknown>;
}

export interface Task {
  id: string;
  workflowId: string;
  name: string;
  type: string;
  state: TaskState;
  dependencies: string[];
  retryPolicy: RetryPolicy;
  timeout: number;
  checkpoint?: TaskCheckpoint;
  assignedNode?: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: TaskError;
  startedAt?: Date;
  completedAt?: Date;
}

export interface RetryPolicy {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface Checkpoint {
  id: string;
  workflowId: string;
  taskId: string;
  state: Record<string, unknown>;
  timestamp: Date;
  nodeId: string;
}

export interface TaskCheckpoint {
  id: string;
  taskId: string;
  progress: number; // 0-100
  state: Record<string, unknown>;
  timestamp: Date;
}

export interface TaskError {
  code: string;
  message: string;
  recoverable: boolean;
  timestamp: Date;
  stack?: string;
}

// ============================================================================
// Healing Types
// ============================================================================

export type HealingStrategy =
  | 'retry'
  | 'reroute'
  | 'failover'
  | 'checkpoint-resume'
  | 'degrade-gracefully'
  | 'store-forward';

export interface HealingAction {
  id: string;
  strategy: HealingStrategy;
  targetId: string;
  targetType: 'workflow' | 'task' | 'route' | 'node';
  reason: string;
  timestamp: Date;
  success: boolean;
  details: Record<string, unknown>;
}

export interface HealthStatus {
  nodeId: string;
  healthy: boolean;
  condition: NetworkCondition;
  metrics: {
    cpuPercent: number;
    memoryPercent: number;
    diskPercent: number;
    activeWorkflows: number;
    queueDepth: number;
  };
  lastHeartbeat: Date;
}

// ============================================================================
// Reporting Types
// ============================================================================

export interface CommandReport {
  id: string;
  type: 'status' | 'alert' | 'completion' | 'failure' | 'healing';
  priority: 'flash' | 'immediate' | 'priority' | 'routine';
  source: string;
  destination: string[];
  timestamp: Date;
  classification: 'unclass' | 'secret' | 'topsecret';
  payload: ReportPayload;
}

export interface ReportPayload {
  workflowId?: string;
  taskId?: string;
  summary: string;
  details: Record<string, unknown>;
  metrics?: Record<string, number>;
  recommendations?: string[];
}

// ============================================================================
// Federation Types
// ============================================================================

export interface CoalitionPartner {
  id: string;
  name: string;
  classification: 'unclass' | 'secret' | 'topsecret';
  endpoints: Endpoint[];
  capabilities: string[];
  trustLevel: number; // 0-1
  active: boolean;
  sharedWorkflows: string[];
}

export interface FederatedTask {
  id: string;
  originPartner: string;
  targetPartners: string[];
  task: Task;
  delegationPolicy: 'execute' | 'observe' | 'coordinate';
  results: Map<string, unknown>;
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const WorkflowSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  version: z.string(),
  priority: z.enum(['critical', 'high', 'normal', 'low']),
  tasks: z.array(z.any()),
  state: z.enum(['pending', 'running', 'paused', 'healing', 'completed', 'failed', 'cancelled']),
  createdAt: z.date(),
  updatedAt: z.date(),
  deadline: z.date().optional(),
  owner: z.string(),
  coalitionPartners: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()),
});

export const CommandReportSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['status', 'alert', 'completion', 'failure', 'healing']),
  priority: z.enum(['flash', 'immediate', 'priority', 'routine']),
  source: z.string(),
  destination: z.array(z.string()),
  timestamp: z.date(),
  classification: z.enum(['unclass', 'secret', 'topsecret']),
  payload: z.object({
    workflowId: z.string().optional(),
    taskId: z.string().optional(),
    summary: z.string(),
    details: z.record(z.unknown()),
    metrics: z.record(z.number()).optional(),
    recommendations: z.array(z.string()).optional(),
  }),
});
