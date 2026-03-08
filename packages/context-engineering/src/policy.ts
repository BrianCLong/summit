import type { BudgetPolicy, ContextPolicies, StreamBudgetPolicy } from './types.js';

export const DEFAULT_STREAM_POLICIES: Record<string, StreamBudgetPolicy> = {
  system: {
    stream: 'system',
    maxTokens: 800,
    priority: 100,
    earlyKeepCount: 1,
    recentKeepCount: 1,
    compressionThreshold: 400,
    pinnedLabels: ['policy', 'pinned'],
  },
  user: {
    stream: 'user',
    maxTokens: 800,
    priority: 90,
    earlyKeepCount: 1,
    recentKeepCount: 2,
    compressionThreshold: 400,
  },
  history: {
    stream: 'history',
    maxTokens: 1800,
    priority: 60,
    earlyKeepCount: 2,
    recentKeepCount: 3,
    compressionThreshold: 300,
  },
  tools: {
    stream: 'tools',
    maxTokens: 600,
    priority: 50,
    earlyKeepCount: 1,
    recentKeepCount: 1,
    compressionThreshold: 300,
  },
  toolOutputs: {
    stream: 'toolOutputs',
    maxTokens: 1200,
    priority: 40,
    earlyKeepCount: 1,
    recentKeepCount: 2,
    compressionThreshold: 250,
  },
  retrieval: {
    stream: 'retrieval',
    maxTokens: 1200,
    priority: 45,
    earlyKeepCount: 1,
    recentKeepCount: 2,
    compressionThreshold: 250,
  },
  state: {
    stream: 'state',
    maxTokens: 600,
    priority: 80,
    earlyKeepCount: 1,
    recentKeepCount: 1,
    compressionThreshold: 200,
  },
  workingMemory: {
    stream: 'workingMemory',
    maxTokens: 600,
    priority: 70,
    earlyKeepCount: 1,
    recentKeepCount: 2,
    compressionThreshold: 200,
  },
};

export const DEFAULT_BUDGET_POLICY: BudgetPolicy = {
  totalBudget: 6400,
  elasticOverflow: 400,
  perStream: DEFAULT_STREAM_POLICIES as BudgetPolicy['perStream'],
};

export const DEFAULT_CONTEXT_POLICIES: ContextPolicies = {
  budget: DEFAULT_BUDGET_POLICY,
  toolOutput: {
    maxTokens: 300,
    allowedFields: [],
  },
};
