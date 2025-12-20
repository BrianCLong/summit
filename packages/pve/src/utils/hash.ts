/**
 * Hash Utility
 *
 * Content hashing and comparison utilities for PVE.
 *
 * @module pve/utils/hash
 */

import crypto from 'node:crypto';

export type HashAlgorithm = 'sha256' | 'sha512' | 'md5';

/**
 * Hash a string using the specified algorithm
 */
export function hashString(
  content: string,
  algorithm: HashAlgorithm = 'sha256',
): string {
  return crypto.createHash(algorithm).update(content, 'utf-8').digest('hex');
}

/**
 * Hash an object by serializing it to JSON first
 */
export function hashObject(
  obj: unknown,
  algorithm: HashAlgorithm = 'sha256',
): string {
  const serialized = JSON.stringify(obj, Object.keys(obj as object).sort());
  return hashString(serialized, algorithm);
}

/**
 * Create a short hash (first N characters)
 */
export function shortHash(
  content: string,
  length: number = 8,
  algorithm: HashAlgorithm = 'sha256',
): string {
  return hashString(content, algorithm).slice(0, length);
}

/**
 * Compare two content strings for equality using hashes
 */
export function contentEquals(a: string, b: string): boolean {
  return hashString(a) === hashString(b);
}

/**
 * Generate a unique ID based on content and timestamp
 */
export function generateContentId(content: string): string {
  const timestamp = Date.now().toString(36);
  const contentHash = shortHash(content, 8);
  return `${timestamp}-${contentHash}`;
}

/**
 * Verify content against a known hash
 */
export function verifyHash(
  content: string,
  expectedHash: string,
  algorithm: HashAlgorithm = 'sha256',
): boolean {
  const actualHash = hashString(content, algorithm);
  return crypto.timingSafeEqual(
    Buffer.from(actualHash, 'hex'),
    Buffer.from(expectedHash, 'hex'),
  );
}
