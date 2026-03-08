import stringify from 'fast-json-stable-stringify';

/**
 * Deterministically stringify a JSON object.
 * Keys are sorted.
 * @param data The data to stringify.
 * @returns The stable JSON string.
 */
export function stableJson(data: unknown): string {
  if (data === undefined) {
    return ''; // Or throw error? For now empty string seems safe for hashing empty.
  }
  return stringify(data);
}
