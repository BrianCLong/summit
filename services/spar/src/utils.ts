import { createHash } from 'crypto';

export function stableStringify(value: unknown): string {
  return stringifyInternal(value);
}

function stringifyInternal(value: unknown): string {
  if (value === null) {
    return 'null';
  }

  if (typeof value === 'number') {
    if (Number.isFinite(value)) {
      return JSON.stringify(value);
    }
    throw new TypeError('Cannot canonicalise non-finite numbers');
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (typeof value === 'boolean' || typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => stringifyInternal(item));
    return `[${items.join(',')}]`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, val]) => typeof val !== 'undefined')
      .map(([key, val]) => `${JSON.stringify(key)}:${stringifyInternal(val)}`)
      .sort();
    return `{${entries.join(',')}}`;
  }

  if (typeof value === 'undefined') {
    return 'null';
  }

  throw new TypeError(`Unsupported value type: ${typeof value}`);
}

export function computeHash(value: unknown): string {
  const canonical = typeof value === 'string' ? value : stableStringify(value);
  return createHash('sha256').update(canonical).digest('hex');
}

export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }

  if (typeof a !== typeof b) {
    return false;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    const keysA = Object.keys(a).sort();
    const keysB = Object.keys(b).sort();
    if (keysA.length !== keysB.length) {
      return false;
    }
    return keysA.every(
      (key, index) => key === keysB[index] && deepEqual(a[key], b[key]),
    );
  }

  return stableStringify(a) === stableStringify(b);
}

export function normalisePolicyTags(tags: string[]): string[] {
  return Array.from(new Set(tags.map((tag) => tag.trim()))).sort();
}

export function normaliseTools<T extends { name: string; version: string }>(
  tools: T[],
): T[] {
  return [...tools].sort((a, b) => {
    if (a.name === b.name) {
      return a.version.localeCompare(b.version);
    }
    return a.name.localeCompare(b.name);
  });
}

export function deepClone<T>(value: T): T {
  return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}
