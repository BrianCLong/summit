export type ContextStream =
  | 'system'
  | 'user'
  | 'history'
  | 'tools'
  | 'toolOutputs'
  | 'retrieval'
  | 'state'
  | 'workingMemory';

export type CompressionState = 'none' | 'extractive' | 'structured';

export type ContextPriority = 'critical' | 'high' | 'medium' | 'low';

export interface ContextItemInput {
  id?: string;
  stream: ContextStream;
  content: unknown;
  source: string;
  provenance: string;
  policyLabels?: string[];
  sensitivityTags?: string[];
  priority?: ContextPriority;
  ttl?: number;
  addedAt?: string;
  lastUsedAt?: string;
  compressionState?: CompressionState;
}

export interface ContextItem extends ContextItemInput {
  id: string;
  tokenCost: number;
  addedAt: string;
  lastUsedAt?: string;
  compressionState: CompressionState;
  evictionReason?: string;
}

export interface StreamBudgetPolicy {
  stream: ContextStream;
  maxTokens: number;
  priority: number;
  earlyKeepCount?: number;
  recentKeepCount?: number;
  compressionThreshold?: number;
  pinnedLabels?: string[];
}

export interface BudgetPolicy {
  totalBudget: number;
  elasticOverflow: number;
  perStream: Record<ContextStream, StreamBudgetPolicy>;
}

export interface ToolOutputPolicy {
  allowedFields?: string[];
  maxTokens?: number;
}

export interface ContextPolicies {
  budget: BudgetPolicy;
  toolOutput: ToolOutputPolicy;
}

export interface ContextBuildInput {
  system?: ContextItemInput[];
  user?: ContextItemInput[];
  history?: ContextItemInput[];
  tools?: ContextItemInput[];
  toolOutputs?: ContextItemInput[];
  retrieval?: ContextItemInput[];
  state?: ContextItemInput[];
  workingMemory?: ContextItemInput[];
  policies?: Partial<ContextPolicies>;
  retrievalUsage?: {
    retrievedIds: string[];
    referencedIds: string[];
  };
}

export interface ContextMetrics {
  context_utilization: number;
  eviction_frequency: number;
  retrieval_precision_proxy: number;
  information_persistence: number;
  token_sinks: Array<{ stream: ContextStream; tokens: number }>;
  total_tokens: number;
}

export interface ContextManifest {
  runId?: string;
  schemaVersion: string;
  createdAt: string;
  items: ContextItem[];
  evictions: Array<{
    itemId: string;
    stream: ContextStream;
    reason: string;
    tokenCost: number;
    evictedAt: string;
  }>;
  metrics: ContextMetrics;
}

export interface BuildContextResult {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  manifest: ContextManifest;
  metrics: ContextMetrics;
}

export interface RetrievalTrigger {
  reason: string;
  query: string;
  force?: boolean;
}

export interface RetrievalResult {
  items: ContextItemInput[];
  query: string;
  summary: string;
  empty: boolean;
}
