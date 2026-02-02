const FALLBACK_TOKEN_RATIO = 4;

export function stableStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value !== 'object') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => `${key}:${stableStringify(val)}`);
  return `{${entries.join(',')}}`;
}

export function estimateTokens(value: unknown): number {
  const text = stableStringify(value);
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / FALLBACK_TOKEN_RATIO));
}

export function truncateToTokenLimit(text: string, maxTokens: number): string {
  if (maxTokens <= 0) return '';
  const maxChars = maxTokens * FALLBACK_TOKEN_RATIO;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars);
}
