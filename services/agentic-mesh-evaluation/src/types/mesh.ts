/**
 * Agentic Mesh Evaluation - Core Type Definitions
 * Comprehensive type system for distributed multi-agent mesh evaluation
 */

import { z } from 'zod';

// ============================================================================
// Mesh Topology Types
// ============================================================================

export type MeshTopology =
  | 'peer-to-peer' // Fully connected mesh
  | 'hierarchical' // Tree-like structure with coordinators
  | 'hybrid' // Mix of P2P and hierarchical
  | 'star' // Central hub with spokes
  | 'ring' // Circular topology
  | 'grid' // 2D mesh grid
  | 'custom'; // User-defined topology

export type AgentRole =
  | 'coordinator' // Orchestrates other agents
  | 'worker' // Executes tasks
  | 'specialist' // Domain-specific expert
  | 'monitor' // Observes and reports
  | 'validator' // Validates results
  | 'optimizer' // Optimizes performance
  | 'fallback'; // Backup for fault tolerance

export type AgentStatus =
  | 'initializing'
  | 'ready'
  | 'busy'
  | 'idle'
  | 'degraded'
  | 'failed'
  | 'offline';

export type CommunicationProtocol =
  | 'direct' // Point-to-point
  | 'broadcast' // One-to-all
  | 'multicast' // One-to-many
  | 'pubsub' // Publish-subscribe
  | 'request-response' // Synchronous RPC
  | 'fire-and-forget'; // Asynchronous messaging

// ============================================================================
// Mesh Node Definition
// ============================================================================

export interface MeshNode {
  id: string;
  name: string;
  agentId: string; // References agent in agent-gateway
  role: AgentRole;
  status: AgentStatus;

  // Capabilities
  capabilities: string[];
  specializations: string[];
  maxConcurrentTasks: number;

  // Network
  endpoint: string;
  protocol: CommunicationProtocol[];
  neighbors: string[]; // Connected node IDs

  // Performance
  performanceMetrics: NodePerformanceMetrics;
  resourceUtilization: ResourceUtilization;

  // Health
  healthStatus: HealthStatus;
  lastHeartbeat: Date;
  uptime: number; // seconds

  // Metadata
  version: string;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface NodePerformanceMetrics {
  tasksCompleted: number;
  tasksSuccessful: number;
  tasksFailed: number;
  averageLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  throughputPerSecond: number;
  errorRate: number;
  successRate: number;
  qualityScore: number; // 0-100
}

export interface ResourceUtilization {
  cpuPercent: number;
  memoryPercent: number;
  diskPercent: number;
  networkBytesPerSecond: number;
  queueDepth: number;
  activeConnections: number;
}

export interface HealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  checks: HealthCheck[];
  lastCheckAt: Date;
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message?: string;
  timestamp: Date;
}

// ============================================================================
// Mesh Definition
// ============================================================================

export interface AgenticMesh {
  id: string;
  name: string;
  description?: string;
  topology: MeshTopology;

  // Nodes
  nodes: MeshNode[];
  edges: MeshEdge[]; // Connections between nodes

  // Configuration
  config: MeshConfiguration;

  // State
  status: MeshStatus;
  phase: MeshPhase;

  // Metrics
  metrics: MeshMetrics;

  // Governance
  policies: MeshPolicy[];

  // Metadata
  tenantId: string;
  projectId?: string;
  ownerId: string;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface MeshEdge {
  id: string;
  sourceId: string;
  targetId: string;
  protocol: CommunicationProtocol;
  bidirectional: boolean;
  weight: number; // For routing optimization
  latencyMs: number;
  bandwidth: number; // bytes/sec
  reliability: number; // 0-1
  metadata: Record<string, unknown>;
}

export type MeshStatus =
  | 'initializing'
  | 'healthy'
  | 'degraded'
  | 'critical'
  | 'offline';

export type MeshPhase =
  | 'setup'
  | 'discovery'
  | 'formation'
  | 'operational'
  | 'evaluation'
  | 'optimization'
  | 'teardown';

export interface MeshConfiguration {
  // Topology
  topologyParams: Record<string, unknown>;

  // Communication
  maxHops: number;
  messageTTL: number; // seconds
  retryPolicy: RetryPolicy;
  timeoutMs: number;

  // Load Balancing
  loadBalancingStrategy: LoadBalancingStrategy;

  // Fault Tolerance
  enableFailover: boolean;
  redundancyFactor: number;
  healthCheckIntervalMs: number;

  // Performance
  maxConcurrentMessages: number;
  messageQueueSize: number;
  enableCircuitBreaker: boolean;
  circuitBreakerThreshold: number;

  // Security
  enableEncryption: boolean;
  enableAuthentication: boolean;
  enableAuthorization: boolean;

  // Observability
  enableMetrics: boolean;
  enableTracing: boolean;
  enableLogging: boolean;
  metricsIntervalMs: number;
}

export type LoadBalancingStrategy =
  | 'round-robin'
  | 'least-loaded'
  | 'random'
  | 'weighted'
  | 'consistent-hashing'
  | 'capability-based';

export interface RetryPolicy {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface MeshPolicy {
  id: string;
  name: string;
  type: PolicyType;
  rules: PolicyRule[];
  enforcement: 'advisory' | 'enforcing' | 'blocking';
  priority: number;
  enabled: boolean;
}

export type PolicyType =
  | 'access-control'
  | 'resource-limit'
  | 'data-governance'
  | 'security'
  | 'compliance'
  | 'performance';

export interface PolicyRule {
  condition: string; // OPA-compatible expression
  action: 'allow' | 'deny' | 'audit';
  message?: string;
}

// ============================================================================
// Mesh Metrics
// ============================================================================

export interface MeshMetrics {
  // Overall
  totalNodes: number;
  activeNodes: number;
  healthyNodes: number;
  degradedNodes: number;
  failedNodes: number;

  // Connectivity
  totalEdges: number;
  averageConnectivity: number;
  networkDiameter: number; // Max hops between any two nodes
  clusteringCoefficient: number;

  // Performance
  aggregateMetrics: AggregateMetrics;

  // Communication
  messageStats: MessageStats;

  // Resource Utilization
  resourceStats: ResourceStats;

  // Quality
  qualityMetrics: QualityMetrics;

  timestamp: Date;
}

export interface AggregateMetrics {
  totalTasksCompleted: number;
  totalTasksSuccessful: number;
  totalTasksFailed: number;
  averageLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  totalThroughput: number;
  errorRate: number;
  successRate: number;
}

export interface MessageStats {
  totalSent: number;
  totalReceived: number;
  totalDropped: number;
  totalRetried: number;
  averageSize: number;
  averageDeliveryTimeMs: number;
  messageBacklog: number;
}

export interface ResourceStats {
  averageCpuPercent: number;
  averageMemoryPercent: number;
  totalNetworkBytesPerSecond: number;
  bottleneckNodes: string[];
}

export interface QualityMetrics {
  dataQuality: number; // 0-100
  serviceQuality: number; // 0-100
  userSatisfaction: number; // 0-100
  complianceScore: number; // 0-100
}

// ============================================================================
// Evaluation Types
// ============================================================================

export type EvaluationScenario =
  | 'performance-baseline' // Measure baseline performance
  | 'load-testing' // Test under load
  | 'stress-testing' // Test at capacity
  | 'fault-injection' // Test resilience
  | 'chaos-engineering' // Random failures
  | 'scalability-testing' // Scale up/down
  | 'security-testing' // Security scenarios
  | 'compliance-testing' // Policy compliance
  | 'optimization' // Resource optimization
  | 'custom'; // User-defined

export interface EvaluationRun {
  id: string;
  meshId: string;
  scenario: EvaluationScenario;
  scenarioParams: Record<string, unknown>;

  // Execution
  status: EvaluationStatus;
  phase: EvaluationPhase;
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;

  // Results
  results: EvaluationResults;

  // Context
  baselineId?: string; // Reference to baseline run
  comparisonIds: string[]; // Other runs to compare

  // Metadata
  triggeredBy: string;
  triggerType: 'manual' | 'scheduled' | 'automated' | 'ci-cd';
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export type EvaluationStatus =
  | 'pending'
  | 'initializing'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout';

export type EvaluationPhase =
  | 'setup'
  | 'warmup'
  | 'execution'
  | 'cooldown'
  | 'analysis'
  | 'reporting';

export interface EvaluationResults {
  // Verdict
  passed: boolean;
  score: number; // 0-100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

  // Metrics
  metrics: EvaluationMetrics;

  // Findings
  findings: Finding[];
  recommendations: Recommendation[];

  // Benchmarks
  benchmarks: Benchmark[];

  // Comparison
  comparison?: ComparisonResults;

  // Artifacts
  artifacts: Artifact[];
}

export interface EvaluationMetrics {
  performance: PerformanceMetrics;
  reliability: ReliabilityMetrics;
  scalability: ScalabilityMetrics;
  efficiency: EfficiencyMetrics;
  security: SecurityMetrics;
  compliance: ComplianceMetrics;
}

export interface PerformanceMetrics {
  latency: LatencyMetrics;
  throughput: ThroughputMetrics;
  responseTime: ResponseTimeMetrics;
}

export interface LatencyMetrics {
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
  p999: number;
  stdDev: number;
}

export interface ThroughputMetrics {
  requestsPerSecond: number;
  tasksPerSecond: number;
  messagesPerSecond: number;
  bytesPerSecond: number;
}

export interface ResponseTimeMetrics {
  average: number;
  fastest: number;
  slowest: number;
  distribution: Record<string, number>; // Histogram
}

export interface ReliabilityMetrics {
  uptime: number; // percentage
  availability: number; // percentage
  mtbf: number; // Mean Time Between Failures (seconds)
  mttr: number; // Mean Time To Recovery (seconds)
  errorRate: number;
  successRate: number;
  failureRate: number;
}

export interface ScalabilityMetrics {
  maxConcurrentTasks: number;
  horizontalScalability: number; // 0-100
  verticalScalability: number; // 0-100
  elasticity: number; // 0-100
  efficiency: number; // throughput per resource unit
}

export interface EfficiencyMetrics {
  resourceUtilization: number; // percentage
  costPerTask: number;
  energyEfficiency: number;
  wasteRatio: number;
}

export interface SecurityMetrics {
  vulnerabilities: number;
  criticalVulnerabilities: number;
  authenticationFailures: number;
  authorizationFailures: number;
  encryptionCoverage: number; // percentage
  securityScore: number; // 0-100
}

export interface ComplianceMetrics {
  policyViolations: number;
  criticalViolations: number;
  complianceRate: number; // percentage
  auditCoverage: number; // percentage
  certificationStatus: 'certified' | 'pending' | 'failed';
}

export interface Finding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: FindingCategory;
  title: string;
  description: string;
  impact: string;
  evidence: Record<string, unknown>;
  affectedNodes: string[];
  timestamp: Date;
}

export type FindingCategory =
  | 'performance'
  | 'reliability'
  | 'security'
  | 'compliance'
  | 'efficiency'
  | 'scalability';

export interface Recommendation {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  rationale: string;
  implementation: string;
  estimatedImpact: string;
  estimatedEffort: string;
  relatedFindings: string[];
}

export interface Benchmark {
  name: string;
  metric: string;
  value: number;
  unit: string;
  baseline?: number;
  target?: number;
  passed: boolean;
  percentageDifference?: number;
}

export interface ComparisonResults {
  baselineId: string;
  improvements: ComparisonItem[];
  regressions: ComparisonItem[];
  unchanged: ComparisonItem[];
  summary: string;
}

export interface ComparisonItem {
  metric: string;
  baseline: number;
  current: number;
  difference: number;
  percentageChange: number;
  significance: 'major' | 'moderate' | 'minor' | 'negligible';
}

export interface Artifact {
  id: string;
  type: ArtifactType;
  name: string;
  description?: string;
  url: string;
  size: number;
  mimeType: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export type ArtifactType =
  | 'report' // PDF/HTML report
  | 'dataset' // CSV/JSON data
  | 'visualization' // Charts/graphs
  | 'trace' // Distributed traces
  | 'logs' // Log files
  | 'metrics' // Time-series metrics
  | 'recording' // Session recordings
  | 'configuration'; // Config snapshots

// ============================================================================
// Task Types
// ============================================================================

export interface MeshTask {
  id: string;
  meshId: string;
  evaluationId?: string;

  // Task Definition
  type: TaskType;
  name: string;
  description?: string;
  payload: Record<string, unknown>;

  // Routing
  targetNodes?: string[]; // Specific nodes, or null for auto-routing
  routingStrategy: RoutingStrategy;

  // Execution
  status: TaskStatus;
  assignedTo?: string; // Node ID
  priority: number; // 0-100

  // Timing
  createdAt: Date;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  timeoutAt?: Date;
  durationMs?: number;

  // Results
  result?: TaskResult;
  error?: TaskError;

  // Dependencies
  dependencies: string[]; // Task IDs
  dependents: string[]; // Task IDs

  // Retry
  retries: number;
  maxRetries: number;

  // Metadata
  tags: string[];
  metadata: Record<string, unknown>;
}

export type TaskType =
  | 'computation'
  | 'query'
  | 'analysis'
  | 'synthesis'
  | 'validation'
  | 'optimization'
  | 'monitoring'
  | 'coordination'
  | 'custom';

export type RoutingStrategy =
  | 'random' // Random node
  | 'round-robin' // Sequential
  | 'least-loaded' // Node with lowest load
  | 'capability-match' // Node with required capability
  | 'locality' // Nearest node
  | 'broadcast' // All nodes
  | 'multicast' // Subset of nodes
  | 'custom'; // Custom routing logic

export type TaskStatus =
  | 'pending'
  | 'queued'
  | 'assigned'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout';

export interface TaskResult {
  success: boolean;
  data: Record<string, unknown>;
  metrics: {
    executionTimeMs: number;
    resourcesUsed: ResourceUtilization;
    qualityScore?: number;
  };
  nodeId: string;
  timestamp: Date;
}

export interface TaskError {
  code: string;
  message: string;
  stack?: string;
  retryable: boolean;
  nodeId?: string;
  timestamp: Date;
}

// ============================================================================
// Message Types
// ============================================================================

export interface MeshMessage {
  id: string;
  type: MessageType;

  // Routing
  sourceId: string;
  targetId: string | string[]; // Single or multiple targets
  protocol: CommunicationProtocol;

  // Content
  payload: Record<string, unknown>;

  // Metadata
  timestamp: Date;
  ttl: number; // Time to live (seconds)
  priority: number;
  correlationId?: string;
  replyTo?: string;

  // Tracking
  hops: number;
  route: string[]; // Node IDs visited

  // Status
  delivered: boolean;
  deliveredAt?: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
}

export type MessageType =
  | 'task-assignment'
  | 'task-result'
  | 'task-error'
  | 'heartbeat'
  | 'discovery'
  | 'status-update'
  | 'coordination'
  | 'broadcast'
  | 'request'
  | 'response'
  | 'event'
  | 'command'
  | 'query';

// ============================================================================
// Event Types
// ============================================================================

export interface MeshEvent {
  id: string;
  meshId: string;
  type: EventType;
  category: EventCategory;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';

  // Content
  title: string;
  description: string;
  details: Record<string, unknown>;

  // Context
  sourceId?: string; // Node or component ID
  affectedNodes: string[];

  // Timing
  timestamp: Date;
  resolvedAt?: Date;

  // Actions
  actions: EventAction[];

  // Metadata
  tags: string[];
  metadata: Record<string, unknown>;
}

export type EventType =
  | 'node-joined'
  | 'node-left'
  | 'node-failed'
  | 'node-recovered'
  | 'topology-changed'
  | 'performance-degraded'
  | 'threshold-exceeded'
  | 'policy-violated'
  | 'security-incident'
  | 'error-occurred'
  | 'milestone-reached'
  | 'evaluation-completed';

export type EventCategory =
  | 'lifecycle'
  | 'performance'
  | 'security'
  | 'compliance'
  | 'operational';

export interface EventAction {
  type: 'alert' | 'remediate' | 'escalate' | 'log' | 'notify';
  target: string;
  payload: Record<string, unknown>;
  executed: boolean;
  executedAt?: Date;
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const MeshNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  agentId: z.string(),
  role: z.enum([
    'coordinator',
    'worker',
    'specialist',
    'monitor',
    'validator',
    'optimizer',
    'fallback',
  ]),
  status: z.enum([
    'initializing',
    'ready',
    'busy',
    'idle',
    'degraded',
    'failed',
    'offline',
  ]),
  capabilities: z.array(z.string()),
  specializations: z.array(z.string()),
  maxConcurrentTasks: z.number().int().positive(),
  endpoint: z.string().url(),
  protocol: z.array(z.string()),
  neighbors: z.array(z.string()),
});

export const CreateMeshRequestSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  topology: z.enum([
    'peer-to-peer',
    'hierarchical',
    'hybrid',
    'star',
    'ring',
    'grid',
    'custom',
  ]),
  nodes: z.array(MeshNodeSchema).min(2),
  config: z.object({
    maxHops: z.number().int().positive().default(10),
    messageTTL: z.number().int().positive().default(300),
    timeoutMs: z.number().int().positive().default(30000),
    loadBalancingStrategy: z
      .enum([
        'round-robin',
        'least-loaded',
        'random',
        'weighted',
        'consistent-hashing',
        'capability-based',
      ])
      .default('least-loaded'),
    enableFailover: z.boolean().default(true),
    redundancyFactor: z.number().int().min(1).max(5).default(2),
  }),
  tenantId: z.string(),
  projectId: z.string().optional(),
});

export const StartEvaluationRequestSchema = z.object({
  meshId: z.string(),
  scenario: z.enum([
    'performance-baseline',
    'load-testing',
    'stress-testing',
    'fault-injection',
    'chaos-engineering',
    'scalability-testing',
    'security-testing',
    'compliance-testing',
    'optimization',
    'custom',
  ]),
  scenarioParams: z.record(z.unknown()).default({}),
  baselineId: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export const SubmitTaskRequestSchema = z.object({
  meshId: z.string(),
  type: z.string(),
  name: z.string(),
  payload: z.record(z.unknown()),
  targetNodes: z.array(z.string()).optional(),
  routingStrategy: z
    .enum([
      'random',
      'round-robin',
      'least-loaded',
      'capability-match',
      'locality',
      'broadcast',
      'multicast',
      'custom',
    ])
    .default('least-loaded'),
  priority: z.number().int().min(0).max(100).default(50),
});
