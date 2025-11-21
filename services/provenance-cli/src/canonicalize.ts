export function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  });

  const ordered: Record<string, unknown> = {};
  for (const [key, item] of entries) {
    ordered[key] = canonicalize(item);
  }

  return ordered;
}

export function canonicalString(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}
