import { createHash } from 'node:crypto';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export const HASH_PREFIX = '[[PFPT::';
export const HASH_SUFFIX = ']]';

export function stableHash(value: string, salt = 'pfpt'): string {
  const hash = createHash('sha256');
  hash.update(salt);
  hash.update('::');
  hash.update(value);
  return hash.digest('hex').slice(0, 12);
}

export function makeReplacement(label: string, hash: string): string {
  return `${HASH_PREFIX}${label.toUpperCase()}#${hash}${HASH_SUFFIX}`;
}

export function isReplacementToken(value: string): boolean {
  return value.includes(HASH_PREFIX) && value.includes(HASH_SUFFIX);
}

export function tryNormalizeJson(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) {
    return content;
  }

  try {
    const parsed = JSON.parse(trimmed) as JsonValue;
    return stableStringify(parsed);
  } catch {
    return content;
  }
}

function sortJson(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map((entry) => sortJson(entry)) as JsonValue;
  }

  if (value && typeof value === 'object') {
    const sortedEntries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
    const mapped: Record<string, JsonValue> = {};
    for (const [key, val] of sortedEntries) {
      mapped[key] = sortJson(val);
    }
    return mapped;
  }

  return value;
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value, null, 2);
  }

  return JSON.stringify(sortJson(value as JsonValue), null, 2);
}

export function tokenize(value: string, treatNewlinesSeparately = false): string[] {
  const pattern = treatNewlinesSeparately ? /(\r?\n)|\s+|[^\s\r\n]+/g : /\s+|[^\s]+/g;
  return value.match(pattern) ?? [];
}

export function groupTokens(tokens: string[], type: 'equal' | 'add' | 'remove'): string {
  if (tokens.length === 0) {
    return '';
  }
  return tokens.join('');
}

export function hasSemanticValue(segment: string): boolean {
  return segment.replace(/\s+/g, '').length > 0;
}

export function mergeConsecutive<T extends { type: string; value: string }>(changes: T[]): T[] {
  if (changes.length === 0) {
    return changes;
  }

  const merged: T[] = [];
  let current = { ...changes[0] };

  for (let index = 1; index < changes.length; index += 1) {
    const change = changes[index];
    if (change.type === current.type) {
      current = { ...current, value: current.value + change.value };
    } else {
      merged.push(current);
      current = { ...change };
    }
  }

  merged.push(current);
  return merged;
}
