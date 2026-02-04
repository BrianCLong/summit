import type { ContextItem, StreamBudgetPolicy } from './types.js';

const DEFAULT_PIN_LABELS = ['intent', 'commitment', 'pinned'];

function isPinned(item: ContextItem, policy: StreamBudgetPolicy): boolean {
  const pinnedLabels = policy.pinnedLabels ?? DEFAULT_PIN_LABELS;
  return (
    item.priority === 'critical' ||
    item.policyLabels?.some(label => pinnedLabels.includes(label))
  );
}

function sumTokens(items: ContextItem[]): number {
  return items.reduce((total, item) => total + item.tokenCost, 0);
}

export function applyStreamBudget(
  items: ContextItem[],
  policy: StreamBudgetPolicy,
): { kept: ContextItem[]; evicted: ContextItem[] } {
  if (!items.length) {
    return { kept: [], evicted: [] };
  }
  const sorted = [...items].sort((a, b) =>
    a.addedAt.localeCompare(b.addedAt),
  );
  const pinned = sorted.filter(item => isPinned(item, policy));
  const pinnedTokens = sumTokens(pinned);
  if (pinnedTokens >= policy.maxTokens) {
    const evicted = sorted
      .filter(item => !pinned.includes(item))
      .map(item => ({
        ...item,
        evictionReason: 'budget-exceeded-pinned',
      }));
    return { kept: pinned, evicted };
  }
  const remainingBudget = policy.maxTokens - pinnedTokens;
  const earlyKeep = policy.earlyKeepCount ?? 1;
  const recentKeep = policy.recentKeepCount ?? 2;
  const nonPinned = sorted.filter(item => !pinned.includes(item));
  const early = nonPinned.slice(0, earlyKeep);
  const recent = nonPinned.slice(
    Math.max(nonPinned.length - recentKeep, earlyKeep),
  );
  const keepSet = new Set([...pinned, ...early, ...recent]);
  const candidates = nonPinned.filter(item => !keepSet.has(item));
  const kept = [...pinned, ...early, ...recent].sort((a, b) =>
    a.addedAt.localeCompare(b.addedAt),
  );
  let currentTokens = sumTokens(kept);
  const evicted: ContextItem[] = [];
  for (const candidate of candidates) {
    if (currentTokens + candidate.tokenCost <= policy.maxTokens) {
      kept.push(candidate);
      currentTokens += candidate.tokenCost;
    } else {
      evicted.push({ ...candidate, evictionReason: 'budget-middle-drop' });
    }
  }
  const trimmed = enforceBudget(kept, policy.maxTokens);
  trimmed.evicted.forEach(item =>
    evicted.push({ ...item, evictionReason: 'budget-trim' }),
  );
  return { kept: trimmed.kept, evicted };
}

function enforceBudget(
  items: ContextItem[],
  maxTokens: number,
): { kept: ContextItem[]; evicted: ContextItem[] } {
  const sorted = [...items].sort((a, b) =>
    a.addedAt.localeCompare(b.addedAt),
  );
  const kept: ContextItem[] = [];
  const evicted: ContextItem[] = [];
  let total = 0;
  for (const item of sorted) {
    if (total + item.tokenCost <= maxTokens) {
      kept.push(item);
      total += item.tokenCost;
    } else {
      evicted.push(item);
    }
  }
  return { kept, evicted };
}
