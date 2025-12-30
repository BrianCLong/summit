
export interface PolicyGoal {
  id: string;
  description: string; // Natural language goal
  taskType: 'generation' | 'retrieval' | 'classification' | 'workflow';
  requiredFields?: string[];
  outputSchema?: Record<string, any>;
  qualityTarget?: 'fast' | 'balanced' | 'high_precision';
}

export interface PolicyConstraints {
  maxLatencyMs?: number;
  maxCostUsd?: number;
  privacyTier?: 'public' | 'internal' | 'confidential' | 'restricted';
  dataResidency?: string[];
  minProvenanceScore?: number;
  noExternalCalls?: boolean;
  maxTokens?: number;
}

export interface Asset {
  id: string;
  type: 'model' | 'tool' | 'retriever' | 'verifier' | 'cache';
  name: string;
  costPerMs?: number;
  costPerToken?: number;
  avgLatencyMs?: number;
  privacyTier: number; // 0=public, 3=restricted
  capabilities: string[];
}

export interface Envelope {
  latencyMs: number;
  costUsd: number;
  tokensIn: number;
  tokensOut: number;
  retries: number;
}

export interface NodeGuard {
  minPrivacyTier?: number;
  allowedResidency?: string[];
  noExternalCalls?: boolean;
  minProvenanceScore?: number;
}

export interface PolicyNode {
  id: string;
  opType: 'LLM_CALL' | 'RETRIEVE' | 'GRAPH_QUERY' | 'TOOL_CALL' | 'VERIFY' | 'SUMMARIZE' | 'CACHE_GET';
  assetRef: string;
  inputs: Record<string, any>; // bindings from previous nodes
  envelope: Envelope;
  guards: NodeGuard;
  exitPredicate?: string; // stringified function or rule ID
  onViolation?: {
    nodeId: string; // Fallback node ID
    reason: string;
  };
  next?: string[]; // Adjacency list
}

export interface PolicyGraph {
  id: string;
  version: string;
  goal: PolicyGoal;
  constraints: PolicyConstraints;
  nodes: PolicyNode[];
  entryNodeId: string;
  globalEnvelope: Envelope;
}

export interface ExecutionTrace {
  traceId: string;
  policyId: string;
  steps: ExecutionStep[];
  status: 'running' | 'completed' | 'failed';
  totalCost: number;
  totalDurationMs: number;
}

export interface ExecutionStep {
  nodeId: string;
  status: 'success' | 'failed' | 'skipped' | 'fallback';
  startedAt: Date;
  completedAt?: Date;
  metrics: {
    latencyMs: number;
    costUsd: number;
    tokensIn: number;
    tokensOut: number;
  };
  output?: any;
  error?: string;
  verificationResult?: boolean;
}

export interface CompileRequest {
  goal: PolicyGoal;
  constraints: PolicyConstraints;
  context?: Record<string, any>;
}

export interface CompileResponse {
  policy: PolicyGraph;
  estimatedMetrics: {
    p50Latency: number;
    p95Latency: number;
    cost: number;
  };
}
