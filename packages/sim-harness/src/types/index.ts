/**
 * Type definitions for simulation harness
 */

export interface EntityTemplate {
  type: string;
  distribution: {
    count: number;
    attributes?: Record<string, AttributeDistribution>;
  };
}

export interface RelationshipTemplate {
  type: string;
  from: string;
  to: string;
  probability: number;
  attributes?: Record<string, AttributeDistribution>;
}

export interface SignalTemplate {
  type: 'anomaly' | 'missing_data' | 'conflicting_evidence';
  entities?: string[];
  probability?: number;
  count?: number;
}

export type AttributeDistribution =
  | string[]
  | { distribution: 'normal'; mean: number; stddev: number }
  | { distribution: 'lognormal'; mean: number; stddev: number }
  | { distribution: 'uniform'; min: number; max: number }
  | { distribution: 'daterange'; start: string; end: string };

export interface ScenarioTemplate {
  name: string;
  type: string;
  description?: string;
  params: {
    nodeCount?: number;
    edgeDensity?: number;
    noiseLevel?: number;
    seed: number;
  };
  entities: EntityTemplate[];
  relationships: RelationshipTemplate[];
  signals?: SignalTemplate[];
}

export interface Entity {
  id?: string;
  type: string;
  name: string;
  properties: Record<string, any>;
}

export interface Relationship {
  id?: string;
  type: string;
  from: number | string;
  to: number | string;
  fromEntityId?: string;
  toEntityId?: string;
  properties?: Record<string, any>;
}

export interface GeneratedScenario {
  id: string;
  name: string;
  type: string;
  description?: string;
  timestamp: string;
  seed: number;
  entities: Entity[];
  relationships: Relationship[];
  signals: Signal[];
  expectedOutcomes: ExpectedOutcomes;
}

export interface Signal {
  type: string;
  entityIndices?: number[];
  description: string;
}

export interface ExpectedOutcomes {
  criticalEntities: string[];
  keyRelationships: string[];
  anomalies: string[];
  minEntitiesFound: number;
  minRelationshipsFound: number;
}

export interface WorkflowStep {
  name: string;
  action:
    | 'graphql-query'
    | 'graphql-mutation'
    | 'rest-get'
    | 'rest-post'
    | 'poll'
    | 'wait'
    | 'assert';
  query?: string;
  endpoint?: string;
  method?: string;
  variables?: Record<string, any>;
  body?: Record<string, any>;
  assertions?: string[];
  until?: string;
  timeout?: number;
  interval?: number;
  delay?: number;
}

export interface WorkflowScript {
  name: string;
  description?: string;
  steps: WorkflowStep[];
}

export interface AnalystSession {
  id: string;
  scenarioId: string;
  workflowName: string;
  startTime: string;
  endTime?: string;
  status: 'running' | 'completed' | 'failed' | 'timeout';
  steps: StepResult[];
  metrics: SessionMetrics;
  errors: string[];
}

export interface StepResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  startTime: string;
  endTime?: string;
  duration?: number;
  result?: any;
  error?: string;
  assertions?: AssertionResult[];
}

export interface AssertionResult {
  expression: string;
  passed: boolean;
  actual?: any;
  expected?: any;
}

export interface SessionMetrics {
  totalDuration: number;
  queriesIssued: number;
  entitiesFound: number;
  relationshipsFound: number;
  timeToFirstInsight?: number;
  queryLatency: LatencyMetrics;
  errorCount: number;
  retryCount: number;
}

export interface LatencyMetrics {
  min: number;
  max: number;
  mean: number;
  p50: number;
  p95: number;
  p99: number;
  samples: number[];
}

export interface EvaluationReport {
  id: string;
  timestamp: string;
  scenarioId: string;
  scenarioName: string;
  sessions: AnalystSession[];
  aggregateMetrics: AggregateMetrics;
  comparison?: ComparisonMetrics;
}

export interface AggregateMetrics {
  performance: {
    avgDuration: number;
    avgQueryLatency: LatencyMetrics;
    avgTimeToInsight: number;
  };
  correctness: {
    entitiesFoundRate: number;
    relationshipsFoundRate: number;
    falsePositiveRate: number;
    falseNegativeRate: number;
  };
  reliability: {
    successRate: number;
    errorRate: number;
    timeoutRate: number;
  };
}

export interface ComparisonMetrics {
  baseline: {
    version: string;
    metrics: AggregateMetrics;
  };
  candidate: {
    version: string;
    metrics: AggregateMetrics;
  };
  deltas: {
    performance: Record<string, number>;
    correctness: Record<string, number>;
    reliability: Record<string, number>;
  };
}

export interface HarnessConfig {
  api: {
    url: string;
    wsUrl?: string;
    token?: string;
    tenantId: string;
    timeout: number;
    maxRetries: number;
  };
  execution: {
    deterministic: boolean;
    defaultSeed: number;
    cleanupAfter: boolean;
    parallelSessions: number;
  };
  reporting: {
    outputDir: string;
    formats: ('json' | 'csv' | 'html')[];
    verbose: boolean;
  };
  safety: {
    requireTestPrefix: boolean;
    blockProductionUrls: boolean;
    maxDataSize: number;
  };
}

export interface GeneratorOptions {
  template: string | ScenarioTemplate;
  params?: {
    nodeCount?: number;
    edgeDensity?: number;
    noiseLevel?: number;
    seed?: number;
  };
}

export interface AnalystOptions {
  apiUrl: string;
  wsUrl?: string;
  token?: string;
  tenantId: string;
  script: string | WorkflowScript;
  timeout?: number;
  verbose?: boolean;
}

export interface RunOptions {
  scenarioId?: string;
  scenario?: GeneratedScenario;
  timeoutMs?: number;
  context?: Record<string, any>;
}
