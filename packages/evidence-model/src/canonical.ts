import { createHash } from 'crypto';

/**
 * Canonicalizes a JSON object by recursively sorting keys and normalizing strings.
 * Handles:
 * - Object key sorting
 * - Unicode normalization (NFC)
 * - Strict JSON stringification
 *
 * @param input - The input object to canonicalize.
 * @returns A canonical JSON string.
 */
export function canonicalize(input: any): string {
  return JSON.stringify(recursiveSort(input));
}

function recursiveSort(input: any): any {
    // 1. Handle primitives
    if (input === null || typeof input !== 'object') {
        // Apply NFC normalization to strings
        if (typeof input === 'string') {
            return input.normalize('NFC');
        }
        return input;
    }

    // 2. Handle Arrays
    if (Array.isArray(input)) {
        return input.map(recursiveSort);
    }

    // 3. Handle Objects
    const sortedKeys = Object.keys(input).sort();
    const canonicalObj: Record<string, any> = {};

    for (const key of sortedKeys) {
        // Normalize keys as well (rare but possible to have non-NFC keys)
        const normalizedKey = key.normalize('NFC');
        canonicalObj[normalizedKey] = recursiveSort(input[key]);
    }
    return canonicalObj;
}

/**
 * Computes the SHA-256 hash of the canonicalized input.
 *
 * @param input - The input object to hash.
 * @returns The SHA-256 hash as a hex string.
 */
export function hash(input: any): string {
  const canonicalString = canonicalize(input);
  return createHash('sha256').update(canonicalString, 'utf8').digest('hex');
}
