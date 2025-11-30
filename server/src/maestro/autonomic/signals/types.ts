
export enum SignalType {
  // Task/Graph
  TASK_LATENCY = 'TASK_LATENCY',
  TASK_SUCCESS_RATE = 'TASK_SUCCESS_RATE',
  TASK_RETRY_COUNT = 'TASK_RETRY_COUNT',
  TASK_FAILURE_COUNT = 'TASK_FAILURE_COUNT',

  // LLM Routing
  LLM_TOKEN_COST = 'LLM_TOKEN_COST',
  LLM_ERROR_RATE = 'LLM_ERROR_RATE',
  LLM_JSON_FAILURE = 'LLM_JSON_FAILURE',
  LLM_MODEL_USAGE = 'LLM_MODEL_USAGE',

  // CI/CD
  CI_BUILD_STATUS = 'CI_BUILD_STATUS', // 1 for green, 0 for red
  CI_FLAKY_TESTS = 'CI_FLAKY_TESTS',
  MERGE_TRAIN_QUEUE_LENGTH = 'MERGE_TRAIN_QUEUE_LENGTH',

  // Infrastructure
  CPU_USAGE = 'CPU_USAGE',
  MEMORY_USAGE = 'MEMORY_USAGE',
  DB_LATENCY = 'DB_LATENCY',
  QUEUE_DEPTH = 'QUEUE_DEPTH',

  // Policy
  POLICY_DENIAL = 'POLICY_DENIAL',
  RED_LINE_ATTEMPT = 'RED_LINE_ATTEMPT',
  SAFETY_FLAG = 'SAFETY_FLAG',

  // Human Feedback
  HUMAN_RATING = 'HUMAN_RATING',
  HUMAN_THUMBS = 'HUMAN_THUMBS', // 1 up, 0 down
}

export interface Signal {
  id: string;
  type: SignalType;
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
  sourceId: string; // Agent ID, Workstream ID, or System ID
  tenantId: string;
}

export interface SignalSeries {
  type: SignalType;
  sourceId: string;
  datapoints: { timestamp: Date; value: number }[];
  period: '5m' | '1h' | '24h' | '7d';
}

export enum HealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  CRITICAL = 'CRITICAL',
  UNKNOWN = 'UNKNOWN',
}

export interface ComponentHealth {
  id: string; // e.g., "agent-planner-gpt4"
  type: 'SYSTEM' | 'WORKSTREAM' | 'AGENT' | 'INFRA';
  score: number; // 0-100
  status: HealthStatus;
  metrics: Record<string, number>; // Key metrics driving this score
  issues: string[]; // List of contributing negative factors
  lastUpdated: Date;
}

export interface HealthSnapshot {
  timestamp: Date;
  system: ComponentHealth;
  workstreams: Record<string, ComponentHealth>;
  agents: Record<string, ComponentHealth>;
  tenantId: string;
}
