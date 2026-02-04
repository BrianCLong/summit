import type {
  BuildContextResult,
  ContextBuildInput,
  ContextItem,
  ContextItemInput,
  ContextManifest,
  ContextMetrics,
  ContextPolicies,
  ContextStream,
  RetrievalResult,
  RetrievalTrigger,
} from './types.js';
import { DEFAULT_CONTEXT_POLICIES } from './policy.js';
import { estimateTokens, stableStringify } from './token.js';
import { adaptToolOutput } from './tool-output.js';
import { applyStreamBudget } from './eviction.js';
import { compressItemIfNeeded } from './compression.js';
import { CONTEXT_MANIFEST_SCHEMA_VERSION } from './manifest-schema.js';

type StreamBuckets = Record<ContextStream, ContextItem[]>;

const STREAMS: ContextStream[] = [
  'system',
  'user',
  'history',
  'tools',
  'toolOutputs',
  'retrieval',
  'state',
  'workingMemory',
];

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeItems(
  inputs: ContextItemInput[] | undefined,
  stream: ContextStream,
  offset: number,
): ContextItem[] {
  if (!inputs?.length) return [];
  return inputs.map((input, index) => {
    if (!input.source) {
      throw new Error(`Context item missing source for stream ${stream}`);
    }
    if (!input.provenance) {
      throw new Error(`Context item missing provenance for stream ${stream}`);
    }
    const id = input.id ?? `${stream}-${offset + index + 1}`;
    const content = input.content ?? '';
    const addedAt = input.addedAt ?? nowIso();
    return {
      ...input,
      id,
      stream,
      content,
      addedAt,
      compressionState: input.compressionState ?? 'none',
      tokenCost: estimateTokens(content),
    };
  });
}

function applyToolPolicies(
  items: ContextItem[],
  policies: ContextPolicies,
): ContextItem[] {
  return items.map(item => {
    if (item.stream !== 'toolOutputs') {
      return item;
    }
    const adapted = adaptToolOutput(item.content, policies.toolOutput);
    return {
      ...item,
      content: adapted.content,
      tokenCost: adapted.tokenCost,
    };
  });
}

function applyCompression(
  items: ContextItem[],
  policies: ContextPolicies,
): ContextItem[] {
  return items.map(item => {
    const streamPolicy = policies.budget.perStream[item.stream];
    return compressItemIfNeeded(item, streamPolicy);
  });
}

function applyBudgets(
  items: ContextItem[],
  policies: ContextPolicies,
): { kept: ContextItem[]; evicted: ContextItem[] } {
  const perStream: StreamBuckets = {
    system: [],
    user: [],
    history: [],
    tools: [],
    toolOutputs: [],
    retrieval: [],
    state: [],
    workingMemory: [],
  };
  for (const item of items) {
    perStream[item.stream].push(item);
  }
  const kept: ContextItem[] = [];
  const evicted: ContextItem[] = [];
  for (const stream of STREAMS) {
    const policy = policies.budget.perStream[stream];
    const result = applyStreamBudget(perStream[stream], policy);
    kept.push(...result.kept);
    evicted.push(...result.evicted);
  }
  const totalBudget = policies.budget.totalBudget + policies.budget.elasticOverflow;
  const overflow = enforceTotalBudget(kept, policies, totalBudget);
  return { kept: overflow.kept, evicted: [...evicted, ...overflow.evicted] };
}

function enforceTotalBudget(
  items: ContextItem[],
  policies: ContextPolicies,
  totalBudget: number,
): { kept: ContextItem[]; evicted: ContextItem[] } {
  const sorted = [...items].sort((a, b) => {
    const aPriority = policies.budget.perStream[a.stream].priority;
    const bPriority = policies.budget.perStream[b.stream].priority;
    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }
    return a.addedAt.localeCompare(b.addedAt);
  });
  let total = sorted.reduce((sum, item) => sum + item.tokenCost, 0);
  if (total <= totalBudget) {
    return { kept: sorted, evicted: [] };
  }
  const evicted: ContextItem[] = [];
  for (let i = sorted.length - 1; i >= 0 && total > totalBudget; i -= 1) {
    const item = sorted[i];
    total -= item.tokenCost;
    evicted.push({ ...item, evictionReason: 'total-budget' });
    sorted.splice(i, 1);
  }
  return { kept: sorted, evicted };
}

function buildMetrics(
  kept: ContextItem[],
  evicted: ContextItem[],
  policies: ContextPolicies,
  input: ContextBuildInput,
): ContextMetrics {
  const totalTokens = kept.reduce((sum, item) => sum + item.tokenCost, 0);
  const totalBudget = policies.budget.totalBudget;
  const totalItems = kept.length + evicted.length;
  const evictionFrequency = totalItems ? evicted.length / totalItems : 0;
  const retrievedIds = input.retrievalUsage?.retrievedIds ?? [];
  const referencedIds = new Set(input.retrievalUsage?.referencedIds ?? []);
  const retrievalPrecision =
    retrievedIds.length === 0
      ? 0
      : retrievedIds.filter(id => referencedIds.has(id)).length /
        retrievedIds.length;
  const pinnedLabels = new Set(
    policies.budget.perStream.history.pinnedLabels ?? ['intent', 'commitment'],
  );
  const pinnedTotal = kept.filter(item =>
    item.policyLabels?.some(label => pinnedLabels.has(label)),
  ).length;
  const pinnedEvicted = evicted.filter(item =>
    item.policyLabels?.some(label => pinnedLabels.has(label)),
  ).length;
  const informationPersistence =
    pinnedTotal + pinnedEvicted === 0
      ? 1
      : pinnedTotal / (pinnedTotal + pinnedEvicted);
  const tokenSinks = STREAMS.map(stream => ({
    stream,
    tokens: kept
      .filter(item => item.stream === stream)
      .reduce((sum, item) => sum + item.tokenCost, 0),
  }))
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 5);
  return {
    context_utilization: totalBudget ? totalTokens / totalBudget : 0,
    eviction_frequency: evictionFrequency,
    retrieval_precision_proxy: retrievalPrecision,
    information_persistence: informationPersistence,
    token_sinks: tokenSinks,
    total_tokens: totalTokens,
  };
}

function buildManifest(
  kept: ContextItem[],
  evicted: ContextItem[],
  metrics: ContextMetrics,
): ContextManifest {
  const evictions = evicted.map(item => ({
    itemId: item.id,
    stream: item.stream,
    reason: item.evictionReason ?? 'budget',
    tokenCost: item.tokenCost,
    evictedAt: nowIso(),
  }));
  return {
    schemaVersion: CONTEXT_MANIFEST_SCHEMA_VERSION,
    createdAt: nowIso(),
    items: [...kept, ...evicted],
    evictions,
    metrics,
  };
}

function toMessages(items: ContextItem[]): BuildContextResult['messages'] {
  return items
    .sort((a, b) => a.addedAt.localeCompare(b.addedAt))
    .map(item => ({
      role: item.stream === 'system'
        ? 'system'
        : item.stream === 'user'
          ? 'user'
          : 'assistant',
      content:
        typeof item.content === 'string'
          ? item.content
          : stableStringify(item.content),
    }));
}

export function buildContext(input: ContextBuildInput): BuildContextResult {
  const policies: ContextPolicies = {
    budget: {
      ...DEFAULT_CONTEXT_POLICIES.budget,
      ...(input.policies?.budget ?? {}),
      perStream: {
        ...DEFAULT_CONTEXT_POLICIES.budget.perStream,
        ...(input.policies?.budget?.perStream ?? {}),
      },
    },
    toolOutput: {
      ...DEFAULT_CONTEXT_POLICIES.toolOutput,
      ...(input.policies?.toolOutput ?? {}),
    },
  };
  const streams: ContextItem[] = [
    ...normalizeItems(input.system, 'system', 0),
    ...normalizeItems(input.user, 'user', 1000),
    ...normalizeItems(input.history, 'history', 2000),
    ...normalizeItems(input.tools, 'tools', 3000),
    ...normalizeItems(input.toolOutputs, 'toolOutputs', 4000),
    ...normalizeItems(input.retrieval, 'retrieval', 5000),
    ...normalizeItems(input.state, 'state', 6000),
    ...normalizeItems(input.workingMemory, 'workingMemory', 7000),
  ];
  const adapted = applyToolPolicies(streams, policies);
  const compressed = applyCompression(adapted, policies);
  const { kept, evicted } = applyBudgets(compressed, policies);
  const metrics = buildMetrics(kept, evicted, policies, input);
  const manifest = buildManifest(kept, evicted, metrics);
  return {
    messages: toMessages(kept),
    manifest,
    metrics,
  };
}

export function updateContextOnToolResult(
  input: ContextBuildInput,
  result: ContextItemInput,
): BuildContextResult {
  const toolOutputs = input.toolOutputs ? [...input.toolOutputs] : [];
  toolOutputs.push({ ...result, stream: 'toolOutputs' });
  return buildContext({ ...input, toolOutputs });
}

export function compressIfNeeded(
  items: ContextItem[],
  policies?: Partial<ContextPolicies>,
): ContextItem[] {
  const policy = {
    budget: {
      ...DEFAULT_CONTEXT_POLICIES.budget,
      ...(policies?.budget ?? {}),
      perStream: {
        ...DEFAULT_CONTEXT_POLICIES.budget.perStream,
        ...(policies?.budget?.perStream ?? {}),
      },
    },
    toolOutput: {
      ...DEFAULT_CONTEXT_POLICIES.toolOutput,
      ...(policies?.toolOutput ?? {}),
    },
  };
  return applyCompression(items, policy);
}

export async function retrieveIfTriggered(
  trigger: RetrievalTrigger | null,
  retrieve: (query: string) => Promise<ContextItemInput[]>,
): Promise<RetrievalResult> {
  if (!trigger) {
    return {
      items: [],
      query: '',
      summary: 'Retrieval not triggered.',
      empty: true,
    };
  }
  const items = await retrieve(trigger.query);
  return {
    items,
    query: trigger.query,
    summary: items.length
      ? `Retrieved ${items.length} items for ${trigger.reason}.`
      : `No docs found for query "${trigger.query}".`,
    empty: items.length === 0,
  };
}
