export function firstString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

export function firstStringOr(
  value: unknown,
  fallback: string,
): string {
  return firstString(value) ?? fallback;
}
