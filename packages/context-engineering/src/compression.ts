import type { ContextItem, StreamBudgetPolicy } from './types.js';
import { estimateTokens, truncateToTokenLimit } from './token.js';

const PRESERVE_LABELS = new Set(['intent', 'commitment', 'pinned', 'policy']);

export function compressItemIfNeeded(
  item: ContextItem,
  policy: StreamBudgetPolicy,
): ContextItem {
  if (!policy.compressionThreshold) {
    return item;
  }
  if (item.policyLabels?.some(label => PRESERVE_LABELS.has(label))) {
    return item;
  }
  if (item.tokenCost <= policy.compressionThreshold) {
    return item;
  }
  const content = typeof item.content === 'string'
    ? item.content
    : JSON.stringify(item.content, null, 2);
  const compressed = extractiveCompress(content, policy.compressionThreshold);
  return {
    ...item,
    content: compressed,
    compressionState: 'extractive',
    tokenCost: estimateTokens(compressed),
  };
}

export function extractiveCompress(text: string, maxTokens: number): string {
  if (!text) return '';
  const sentences = text.split(/(?<=[.!?])\s+/);
  let output = '';
  for (const sentence of sentences) {
    const candidate = output ? `${output} ${sentence}` : sentence;
    if (estimateTokens(candidate) > maxTokens) {
      break;
    }
    output = candidate;
  }
  if (!output) {
    return truncateToTokenLimit(text, maxTokens);
  }
  return output;
}
