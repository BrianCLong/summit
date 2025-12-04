import murmurhash from 'murmurhash';

/**
 * Generates a consistent hash for bucket assignment.
 * Uses MurmurHash3 for fast, uniform distribution.
 *
 * @param key - The key to hash (usually experimentKey + userId)
 * @param seed - Optional seed for the hash (default: 0)
 * @returns A number between 0 and 1
 */
export function hashToBucket(key: string, seed: number = 0): number {
  const hash = murmurhash.v3(key, seed);
  return (hash >>> 0) / 0xffffffff;
}

/**
 * Determines if a user should be included in a rollout percentage.
 *
 * @param key - The key to hash (usually experimentKey + userId)
 * @param percentage - The rollout percentage (0-100)
 * @param seed - Optional seed for the hash
 * @returns true if the user is within the rollout percentage
 */
export function isInRollout(
  key: string,
  percentage: number,
  seed: number = 0,
): boolean {
  if (percentage <= 0) return false;
  if (percentage >= 100) return true;
  return hashToBucket(key, seed) * 100 < percentage;
}

/**
 * Selects a variant based on weighted distribution.
 *
 * @param key - The key to hash (usually experimentKey + userId)
 * @param variants - Array of variants with weights (weights should sum to 100)
 * @param seed - Optional seed for the hash
 * @returns The selected variant index, or -1 if no variant selected
 */
export function selectVariant<T extends { weight: number }>(
  key: string,
  variants: T[],
  seed: number = 0,
): number {
  if (variants.length === 0) return -1;

  const bucket = hashToBucket(key, seed) * 100;
  let cumulativeWeight = 0;

  for (let i = 0; i < variants.length; i++) {
    cumulativeWeight += variants[i].weight;
    if (bucket < cumulativeWeight) {
      return i;
    }
  }

  return variants.length - 1;
}
